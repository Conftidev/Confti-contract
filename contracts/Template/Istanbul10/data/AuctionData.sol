//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../Interface/IAuctionData.sol";

contract AuctionData is IAuctionData {
    // ---------------   Dao Address  ------------------------
    address override public router;

    // ---------------    manage    ----------------------
    bool override public initializer;
    
    bool internal reentry;

    // ---------------    auction     ---------------------
    struct AuctionInfo {
        uint256 price;
        uint256 auctionEnd;
        uint256 livePrice;
        address payable winning;
    }

    mapping(uint256 => AuctionInfo) public auctions;

    uint256 override public auctionLength;
}
