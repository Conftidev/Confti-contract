//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../data/VaultData.sol";
import "../Interface/IVault.sol";
import "../Interface/IVeToken.sol";
import "../Interface/IRouterData.sol";
import "../../../Interface/IFactory.sol";
import "../../../Interface/ISettings.sol";
import "../../../Interface/IDivision.sol";
import "../../../Interface/IWETH.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract Vault is IVault , VaultData {

    address public constant WETH = 0x6085A86303E362c2A7434a7EA270d60A125B183c;
  
    bytes4 internal constant ERC1155_INTERFACE_ID = 0xd9b67a26;
 
    bytes4 internal constant ERC721_INTERFACE_ID = 0x80ac58cd;

    uint8 internal constant ENTIRE_VAULT_INDEX = 0; 

    uint8 internal constant NFT_NOT_EXIST = 0; 

    uint256 internal constant MAXIMUM_NUMBER_OF_NFT = 50; 
    

    modifier checkSender() {
        require(IRouterData(router).whiteList(msg.sender),"whiteList :: Address check error");
        _;
    }

    modifier nonReentrant() {
        require(!reentry,"reentry :: Illegal reentrant");
        reentry = true;
        _;
        reentry = false;
    }

    constructor() {

    }

    function initialize() external {
        require(!initializer,"initialize :: Already initialized");
        initializer = !initializer;

        router = msg.sender;
        redeemable = true;
        // 0 is the Entire vault index in nfts
        nfts.push(NFT({
            nft          : address(0),
            nftId        : 0,
            amount       : 0,
            mold         : State.NftType.All,
            state        : State.NftState.freedom,
            activity     :"none",
            weight       : 0
        }));
    }
    
    
    // --------------------------------      Asset      -----------------------------------------

    function sendETH(address payable who,uint256 amount) external override checkSender nonReentrant {
        require(who != address(0),"sendETH :: Cannot transfer to zero address");
        who.transfer(amount);
    }

    function sendERC20(address token,address to,uint256 amount) external override checkSender nonReentrant {
        require(to != address(0),"sendERC20 :: Cannot transfer to zero address");
        IERC20(token).transfer(to,amount);
    }

    function sendWETH(address who, uint256 amount) external override checkSender nonReentrant{
        require(who != address(0),"sendWETH :: Cannot transfer to zero address");
        IWETH(WETH).deposit{value: amount}();
        IWETH(WETH).transfer(who, IWETH(WETH).balanceOf(address(this)));
    }

    // ------------------------------      NFT       --------------------------------------------
    function depositNFTAsset(address[] memory nft , uint256[] memory nftId , uint256[] memory amount, address sender,uint256 weight_) external override checkSender nonReentrant{
        _depositNFT(nft , nftId , amount, sender,weight_);
    }

    function _depositNFT(address[] memory nft , uint256[] memory nftId , uint256[] memory amount, address sender,uint256 weight_) private {
        require(getEntireVaultState() == State.NftState.freedom,"Vault :: Incorrect vault state");
        for(uint16 i = 0; i < nft.length ; i++) {
            require(MAXIMUM_NUMBER_OF_NFT > freedomNFTInNFTSIndex.length,"Vault :: Exceed maximum limit");
            // Send some NFT to the current address to return type NFT
            State.NftType _nftType = _sendNFT( nft[i] , nftId[i] , amount[i], sender , address(this));
            // Get nftIndex if it is ERC1155 class repeated pledge
            uint256 _nftIndex = nftIndex[nft[i]][nftId[i]];
            // An error is reported if the NFT state is occupied or the NFT vault is not free 
            // If Index is not empty and the NFT state is equal to the free state then the quantity ++ 
            require(nfts[_nftIndex].state != State.NftState.occupied,"Vault :: Incorrect vault state");

            if(_nftIndex != NFT_NOT_EXIST && nfts[_nftIndex].state == State.NftState.freedom){
                require(nfts[_nftIndex].nft == nft[i] , "Vault:: Incorrect NFT  address");
                require(nfts[_nftIndex].nftId == nftId[i] , "Vault:: Incorrect NFT Id");
                nfts[_nftIndex].amount += amount[i];
                nfts[ENTIRE_VAULT_INDEX].weight = nfts[ENTIRE_VAULT_INDEX].weight - nfts[_nftIndex].weight + weight_;
                nfts[_nftIndex].weight = weight_;
            // If the NFT is a new NFT or the NFT is in the away state it will generate a new array and insert the array 
            }else {
                nfts.push(NFT({
                    nft :  nft[i],
                    nftId : nftId[i],
                    amount : amount[i],
                    mold : _nftType,
                    state : State.NftState.freedom,
                    activity : "none",
                    weight : weight_
                }));
                nfts[ENTIRE_VAULT_INDEX].weight = nfts[ENTIRE_VAULT_INDEX].weight + weight_;
                nftIndex[nft[i]][nftId[i]] = nfts.length -1;
                addFreedomStateIndex(nfts.length -1);
            }
        }
    }
    
    // function beforeIssueLeave(address[] memory nft,uint256[] memory nftId,address to) external checkSender nonReentrant{
    //     require(IERC20(getDivision()).totalSupply() == 0,"beforeIssueLeave :: already issue");
    //     for(uint16 i = 0; i < nft.length ; i++) {
    //         // Verify that the wrong address was passed in
    //         uint256 _index = nftIndex[nft[i]][nftId[i]];
    //         require(_index != NFT_NOT_EXIST,"beforeIssueLeave :: NFT does not exist");
    //         // Send the NFT 
    //         _sendNFT( nft[i] , nftId[i] , nfts[_index].amount , address(this) , to);

    //         nfts[freedomNFTInNFTSIndex[_index]] = nfts[nfts.length-1];
    //         nfts.pop();

    //         deleteFreedomStateIndex(_index);
            
    //         nftIndex[nft[i]][nftId[i]] = 0;
    //     }
    // }
 
    function sendNFTAsset(address[] memory nft,uint256[] memory nftId, address to ) external override checkSender nonReentrant{
        for(uint16 i = 0; i < nft.length ; i++) {
            _sendNFTAssetIndex(nftIndex[nft[i]][nftId[i]], to);
        }
    }
    
    function sendNFTAssetIndex(uint256[] memory index,address to) external override checkSender nonReentrant{
        for(uint16 i = 0; i < index.length ; i++) {
            _sendNFTAssetIndex(index[i],to);
        }
    }

    function _sendAllFreedomNFTAsset(address to) private {
        while(freedomNFTInNFTSIndex.length != 0) {
            _sendNFTAssetIndex(freedomNFTInNFTSIndex[freedomNFTInNFTSIndex.length - 1],to);
        }
    }

    function _sendNFTAssetIndex(uint256 index,address to) private {
        // Verify that the wrong address was passed in
        require(index != NFT_NOT_EXIST,"Vault :: NFT does not exist");

        nfts[ENTIRE_VAULT_INDEX].weight = nfts[index].weight;
        nfts[index].weight = 0;
        
        // Send the NFT 
        _sendNFT( nfts[index].nft , nfts[index].nftId , nfts[index].amount , address(this) , to);
        // Change the NFT state to Leave
        setState(index , State.NftState.leave , nfts[index].activity);
    }
 
    function _sendNFT(address nft,uint256 nftId,uint256 amount,address sender ,address to) private returns(State.NftType){
        require(to != address(0),"sendNFT :: Cannot transfer to zero address");
        if (ERC165Checker.supportsInterface(nft, ERC1155_INTERFACE_ID)){
            IERC1155(nft).safeTransferFrom(sender, to, nftId ,amount,"");
            return State.NftType.NFT1155;
        }
        else if (ERC165Checker.supportsInterface(nft, ERC721_INTERFACE_ID)){ 
            IERC721(nft).safeTransferFrom(sender, to, nftId);
            return State.NftType.NFT721;
        }else {
            revert("Vault :: Incorrect NFT address");
        }
    }
 
    function safeSetState(address nft,uint256 nftId, State.NftState newState,string memory activity) external override checkSender nonReentrant{
        uint256 _index = nftIndex[nft][nftId];
        require(nfts[_index].state != State.NftState.leave ,"Vault :: NFT does not exist");
        if(nft == address(0) && nftId == 0){
            nfts[_index].activity = activity;
            nfts[_index].state = newState;
            return;
        }
        require(_index != NFT_NOT_EXIST,"Vault:: NFT does not exist");

        setState(_index,newState,activity);
    }

    function setState(uint256 index , State.NftState newState,string memory activity) private {
        State.NftState _oldState = nfts[index].state;
        nfts[index].activity = activity;
        nfts[index].state = newState;
        
        if(_oldState == State.NftState.freedom && newState == State.NftState.freedom) {
            return;
        }else if(_oldState != State.NftState.freedom && newState == State.NftState.freedom){
            addFreedomStateIndex(index);
        }else{
            deleteFreedomStateIndex(index);
        }
    }
     
    function addFreedomStateIndex(uint256 index) private {
        freedomNFTInNFTSIndex.push(index);
    }

    function deleteFreedomStateIndex(uint256 index) private {
        for(uint32 i = 0; i < freedomNFTInNFTSIndex.length ; i++) {
            if(freedomNFTInNFTSIndex[i] == index) {
                freedomNFTInNFTSIndex[i] = freedomNFTInNFTSIndex[freedomNFTInNFTSIndex.length-1];
                freedomNFTInNFTSIndex.pop(); 
            }
        }
    }

    /// @notice an external function to burn all ERC20 tokens to receive the ERC721 token
    function redeem() external override nonReentrant{
        require(IERC20(getDivision()).totalSupply() != 0, "redeem :: The number of fragments is zero");
        require(getEntireVaultState() != State.NftState.leave, "redeem :: NFT does not exist");
        require(redeemable, "redeem :: Unable to remedy");
        IFactory _factory = IFactory(IRouterData(router).factory());
        address govAddress = ISettings(_factory.settings()).feeReceiver();
        uint256 govBalance = IERC20(getDivision()).balanceOf(govAddress);
        uint256 accountBalance = IERC20(getDivision()).balanceOf(msg.sender);

        uint256 _totalAmount = IVeToken(getVeToken()).totalClaimable() + IERC20(getDivision()).totalSupply();

        require(accountBalance >= _totalAmount - govBalance ,"redeem :: Not enough to burn");

        IDivision(getDivision()).burnDivision(msg.sender,accountBalance);
        IDivision(getDivision()).burnDivision(govAddress,govBalance);

        _sendAllFreedomNFTAsset(msg.sender);
 
        nfts[ENTIRE_VAULT_INDEX].activity = "redeemed";
        nfts[ENTIRE_VAULT_INDEX].state =  State.NftState.leave;
        emit Redeem(msg.sender);
    }

    function noncallable() external override checkSender {
        redeemable = false;
    }
 
    function getNftState(address nft,uint256 nftId) public override view returns(State.NftState){
        uint256 _index = nftIndex[nft][nftId];
        require(_index != NFT_NOT_EXIST,"Vault :: NFT does not exist");
        return nfts[_index].state;
    }

    function getEntireVaultState() public override view returns(State.NftState) {
        return nfts[ENTIRE_VAULT_INDEX].state;
    }

    function getNftActivity(address nft,uint256 nftId) public override view returns(string memory){
        uint256 _index = nftIndex[nft][nftId];
        require(_index != NFT_NOT_EXIST,"Vault :: NFT does not exist");
        return nfts[_index].activity;
    }

    function getEntireVaultActivity() public override view returns(string memory){ 
        return nfts[ENTIRE_VAULT_INDEX].activity;
    }

    function getFreedomNFT() public override view returns(uint256[] memory) {
        return freedomNFTInNFTSIndex;
    } 
 
    function getDivision() public view returns(address) {
        return IRouterData(router).division();
    }

    function getVeToken() public view returns(address) {
        return IRouterData(router).veToken();
    }


    
    function onERC721Received(address, address, uint256, bytes memory) public virtual returns (bytes4) {
        return this.onERC721Received.selector;
    }
    
    function onERC1155Received(address, address, uint256, uint256, bytes memory) public virtual  returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] memory, uint256[] memory, bytes memory) public virtual  returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function updateVault(address updataTemplate) override external checkSender { 
        require(getEntireVaultState() == State.NftState.freedom,"Vault :: The vault has been sold.");
        (bool _ok, bytes memory returnData) = updataTemplate.delegatecall(abi.encodeWithSignature(
            "updateVaultUtils()"
        ));

        require(_ok, string(returnData));
    } 

}
