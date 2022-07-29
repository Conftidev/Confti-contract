//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 
import "../Interface/IRouter.sol";
import "../Interface/IRouterData.sol";
import "../Interface/IAuction.sol";
import "../data/AuctionData.sol";
import "../../../utils/State.sol";
import "../../../Interface/ISettings.sol";
import "../Interface/IVault.sol";
import "../Interface/IVaultData.sol";
import "../../../Interface/IFactory.sol";
import "../Interface/IVeToken.sol";


contract Auction is IAuction, AuctionData {

    modifier nonReentrant() {
        require(!reentry,"reentry :: Illegal reentrant");
        reentry = true;
        _;
        reentry = false;
    }

    function initialize() override external nonReentrant {
        require(!initializer,"initialize :: Already initialized");
        initializer = !initializer;
        router = msg.sender;
        auctionLength = 2 minutes;
    }

    function setPrice(address nft,uint256 nftId,uint256 price_) override external nonReentrant {
        require(IRouterData(router).whiteList(msg.sender),"setPrice :: Caller permission error");
        uint256 _nftInVaultIndex = IVaultData(getVault()).nftIndex(nft,nftId);
        auctions[_nftInVaultIndex].price = price_;
        emit SetPrice(nft,nftId,price_);
    }
    
    function updateAuctionLength(uint256 length) override external nonReentrant {
        require(IVault(getVault()).getEntireVaultState() == State.NftState.freedom, "update :: not update");
        require(msg.sender == IRouterData(router).curator(), "update :: not curator");
        require(length >= getSettings().minAuctionLength() && length <= getSettings().maxAuctionLength(), "update :: invalid auction length");

        auctionLength = length;
        emit UpdateAuctionLength(length);
    }
    

    /// @notice kick off an auction. Must send reservePrice in ETH
    function start() override external payable nonReentrant {
        AuctionInfo storage _auction = auctions[0];
        require(IVault(getVault()).getEntireVaultState() == State.NftState.freedom, "start :: no auction starts");
        require(_auction.price != 0,"start :: Entire vault price is zore");
        require(msg.value >= _auction.price, "start :: too low bid");

        _auction.auctionEnd = block.timestamp + auctionLength;

        IVault(getVault()).safeSetState(address(0),0,State.NftState.occupied,"Auction");

        _auction.livePrice = msg.value;
        payable(getVault()).transfer(_auction.livePrice);
        _auction.winning = payable(msg.sender);


        IVault(getVault()).noncallable(); 
        IVeToken(getVeToken()).stopReward();
        
        emit Start(_auction.winning, _auction.livePrice);
    }

    /// @notice an external function to bid on purchasing the vaults NFT. The msg.value is the bid amount
    function bid() override external payable nonReentrant {
        AuctionInfo storage _auction = auctions[0];
        require(IVault(getVault()).getEntireVaultState() == State.NftState.occupied && utilCompareInternal(IVault(getVault()).getEntireVaultActivity(),"Auction"), "bid :: auction is not live");
  
        uint256 increase = getSettings().minBidIncrease() + 1000;// 5%

        require(msg.value * 1000 >= _auction.livePrice * increase, "bid :: too low bid");
        require(block.timestamp < _auction.auctionEnd, "bid :: auction ended");
    
        // If bid is within 15 minutes of auction end, extend auction
        if (_auction.auctionEnd - block.timestamp <= 15 minutes) {
            // auctionEnd += 15 minutes;
            _auction.auctionEnd += 15 minutes;
        }

        payable(getVault()).transfer(msg.value);
        
        IVault(getVault()).sendETH(_auction.winning, _auction.livePrice);

        _auction.winning = payable(msg.sender);
        _auction.livePrice = msg.value;
        emit Bid(_auction.winning, _auction.livePrice);
    }

    /// @notice an external function to end an auction after the timer has run out
    function end() override external nonReentrant {
        AuctionInfo storage _auction = auctions[0];
        require( IVault(getVault()).getEntireVaultState() == State.NftState.occupied && utilCompareInternal(IVault(getVault()).getEntireVaultActivity(),"Auction"), "end :: vault has already closed" );
        require(block.timestamp >= _auction.auctionEnd, "end :: auction live");

        IRouter(router).claimFees();

        // transfer NFT to winner
        IVault(getVault()).sendNFTAssetIndex(IVault(getVault()).getFreedomNFT(),_auction.winning);

        IVault(getVault()).safeSetState(address(0),0,State.NftState.leave,"Auction");
        
        emit Won(_auction.winning, _auction.livePrice);
    }


    function utilCompareInternal(string memory a, string memory b) public pure returns (bool) {
        if (bytes(a).length != bytes(b).length) {
            return false;
        }
        for (uint i = 0; i < bytes(a).length; i ++) {
            if(bytes(a)[i] != bytes(b)[i]) {
                return false;
            }
        }
        return true;
    }

    function getVault() public view returns(address){
        return IRouterData(router).vault();
    }

    function getVeToken() public view returns(address){
        return IRouterData(router).veToken();
    }

    function getSettings() public view returns(ISettings) {
        IFactory _factory = IFactory(IRouterData(router).factory());
        return ISettings(_factory.settings());
    }
    
    function updateAuction(address _updataTemplate) external override{
        require(IRouterData(router).whiteList(msg.sender),"setPrice :: Caller permission error");
        (bool _ok, bytes memory returnData) = _updataTemplate.delegatecall(abi.encodeWithSignature(
            "updateAuctionUtils()"
        ));

        require(_ok, string(returnData));
    }
    
}
