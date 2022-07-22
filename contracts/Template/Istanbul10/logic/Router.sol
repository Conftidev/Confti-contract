//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../data/RouterData.sol";
import "../Interface/IRouter.sol";
import "../../../Interface/IFactory.sol";
import "../../../Interface/ISettings.sol";
import "../Interface/IVault.sol";
import "../Interface/IVote.sol";
import "../../../Interface/IDivision.sol";
import "../Interface/IAuction.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {InitializedProxy} from "../../../InitializedProxy.sol";
import "@openzeppelin/contracts-upgradeable/utils/StorageSlotUpgradeable.sol";

contract Router is RouterData , IRouter{
    
    // ----------------  IMMUTABLE  ---------------
    string public constant VERSION_NAME = "Token Economic & Proposol";

    uint16 public constant VERSION_NUMBER = 10; // 1.0

    address public immutable override veTokenTemplate; 

    address public immutable override vaultTemplate; 

    address public immutable override auctionTemplate; 

    address public immutable override voteTemplate; 

    address public immutable override divisionTemplate; 
    
    modifier nonReentrant() {
        require(!reentry,"reentry :: Illegal reentrant");
        reentry = true;
        _;
        reentry = false;
    }

    constructor(address veTokenTemplate_ , address vaultTemplate_ , address auctionTemplate_ , address voteTemplate_ , address divisionTemplate_) { 
        veTokenTemplate = veTokenTemplate_; 
        vaultTemplate = vaultTemplate_;
        auctionTemplate = auctionTemplate_;
        voteTemplate = voteTemplate_;
        divisionTemplate = divisionTemplate_;
    }
    

    function initialize(address curator_,address settings_,string memory name) override external {
        require(!initializer,"initialize :: Already initialized");
        initializer = !initializer;
        factory = msg.sender;

        daoName = name;
        
        bytes memory _vaultInitializationCallData = abi.encodeWithSignature(
            "initialize()"
        );

        vault = createContract(vaultTemplate , _vaultInitializationCallData);
        setWhiteList(vault, true);

        setWhiteList(address(this), true);
        curator = curator_;
        settings = settings_;
        emit Initialize(curator,vault);
    }

    function curatorDeposit(address[] memory nft,uint256[] memory nftId,uint256[] memory amount) override external nonReentrant {
        require(!open, "curatorDeposit :: Token is already active");
        require(msg.sender == curator, "curatorDeposit :: Only curator can deposit NFT");
        IVault(vault).depositNFTAsset(nft,nftId,amount,msg.sender,10000);
        emit CuratorDeposit(nft,nftId,amount);
    }

    function issue(uint256 supply_ , string memory symbol , uint256 reserveRatio_ , uint256 entireVaultPrice ,uint256 depositLength,uint256 rewardLength) override external nonReentrant {
        require(IVault(vault).getFreedomNFT().length != 0 ,"issue :: It's an empty vault");
        require(msg.sender == curator, "issue :: Only curator can issue the tokens");
        require(!open, "issue :: Token is already active");
        require(supply_ >= 10000*(10**18), "issue :: The supply must be greater than 10000");
        require(reserveRatio_ <= 9900, "issue :: Incorrect reserve ratio");
        open = true;

        
        bytes memory _divisionInitializationCallData = abi.encodeWithSignature(
            "initialize(string,string)",
            daoName,
            symbol
        );

        division = createContract(divisionTemplate, _divisionInitializationCallData);
        setWhiteList(division, true);
 
        uint256 _reserveAmount = _mintToScale(supply_,curator);
        
        bytes memory _veTokenInitializationCallData = abi.encodeWithSignature(
            "initialize(uint256,uint256,uint256)",
            _reserveAmount,
            depositLength,
            rewardLength
        );
        
        
        veToken = createContract(veTokenTemplate, _veTokenInitializationCallData);
        setWhiteList(veToken, true);

        bytes memory _emptyInitializationCallData = abi.encodeWithSignature(
            "initialize()"
        );
        
        auction = createContract(auctionTemplate, _emptyInitializationCallData);
        setWhiteList(auction, true);

        vote = createContract(voteTemplate, _emptyInitializationCallData);
        setWhiteList(vote, true);

        lastClaimed = block.timestamp;
        fee = 0;

        reserveRatio = reserveRatio_;

        IAuction(auction).setPrice(address(0),0,entireVaultPrice);
        emit Issue( supply_ , daoName , symbol , reserveRatio , entireVaultPrice, depositLength , rewardLength , veToken , auction , vote , division);
    }

    function mintToScale(uint256 supply_ ,address mintTo) override external onlyWhiteList nonReentrant returns(uint256){
        return _mintToScale(supply_,mintTo);
    }

    function _mintToScale(uint256 supply_ ,address mintTo) private returns(uint256){
        supply += supply_;

        uint256 _govAmount = supply_ * 100 / 10000;
        uint256 _reserveAmount = supply_ * reserveRatio / 10000;
        uint256 _targetAmount = supply_ - _govAmount - _reserveAmount;

        reserveAmount += _reserveAmount; // change call veToken
        address govAddress = ISettings(settings).feeReceiver();
        IDivision(division).mintDivision(govAddress,_govAmount);
        IDivision(division).mintDivision(mintTo,_targetAmount);
        return _reserveAmount;
    }

    function claimFees() override external nonReentrant {
        require(IVault(vault).getEntireVaultState() != State.NftState.leave, "claim :: cannot claim after auction ends");
        require(open, "claim :: Token not already active");
        // get how much in fees the curator would make in a year
        uint256 currentAnnualFee = fee * IERC20(division).totalSupply() / 1000;
        // get how much that is per second;
        uint256 feePerSecond = currentAnnualFee / 31536000;
        // get how many seconds they are eligible to claim
        uint256 sinceLastClaim = block.timestamp - lastClaimed;
        // get the amount of tokens to mint
        uint256 curatorMint = sinceLastClaim * feePerSecond;

        lastClaimed = block.timestamp;

        IDivision(division).mintDivision(curator, curatorMint); 
    }

    // @notice an external function to burn ERC20 tokens to receive ETH from ERC721 token purchase
    function cash() override external nonReentrant {
        require( IVault(vault).getEntireVaultState() == State.NftState.leave, "end :: The vault is still open" );
        uint256 bal = IERC20(division).balanceOf(msg.sender);
        require(bal > 0, "cash:no tokens to cash out");
        uint256 share = bal * address(vault).balance / IERC20(division).totalSupply();
        IDivision(division).burnDivision(msg.sender, bal);
        IVault(vault).sendETH(payable(msg.sender), share);
        emit Cash(msg.sender, share); 
    }


    function versionInfo() external pure override returns(string memory,uint16){
        return (VERSION_NAME , VERSION_NUMBER);
    }


    // -------------------------------    create contract    -------------------------------
    function createContract(address template,bytes memory code) private returns(address){
        return address(
            new InitializedProxy(
                template,
                code
            )
        );
    } 

    function setWhiteList(address targetAddress,bool bool_) private {
        whiteList[targetAddress] = bool_;
    }

    modifier onlyWhiteList() {
        require(whiteList[msg.sender],"whiteList :: Address check error");
        _;
    }
    
    function updateRouter(address updataTemplate) override external onlyWhiteList { 

        (bool _ok, bytes memory returnData) = updataTemplate.delegatecall(abi.encodeWithSignature(
            "updateRouterUtils()"
        ));
    
        require(_ok, string(returnData));
    } 

}
