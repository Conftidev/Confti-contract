//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAuction {

    function initialize() external; 

    function setPrice(address,uint256,uint256) external; 

    function updateAuctionLength(uint256) external; 

    function start() external payable; 

    function bid() external payable; 

    function end() external; 


    function updateAuction(address) external;
    
    
    // ---------------    auction     ---------------------

    /// @notice An event emitted when a user updates their price
    event SetPrice(address nft,uint256 nftId,uint price);

    /// @notice An event emitted when an auction starts
    event Start(address indexed buyer, uint price);

    /// @notice An event emitted when a bid is made
    event Bid(address indexed buyer, uint price);

    /// @notice An event emitted when an auction is won
    event Won(address indexed buyer, uint price);
    
    /// @notice An event emitted when update auction length
    event UpdateAuctionLength(uint256 length);
  
}
