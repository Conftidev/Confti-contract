//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAuctionData {

    // ---------------   Dao Address  ------------------------
    function router() external returns(address);

    // ---------------    manage    ----------------------
    function initializer() external returns(bool);

    // ---------------    auction     --------------------- 
    function auctionLength() external returns(uint256);  
}
