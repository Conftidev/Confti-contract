//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VeTokenData{
    // ----------- struct --------------
    struct LockedBalance {
        int256 amount;
        uint256 end;
        uint256 ts;
    }
    struct Point {
        int256 bias;
        int256 slope;
        uint256 ts;
        uint256 blk;
    }
    // Proxy Address
    address public router;
    bool public initializer;
    bool public isReentry;

    uint256 public totalReward;
    // uint256 public surplusTotalReward;
    uint256 public totalClaimedReward;
    uint256 public maxPledgeDuration;
    uint256 public maxRewardDuration;
    uint256 public supply;
    uint256 public firstDepositTime;
    uint256 public startAuctionTime;

    mapping(address => LockedBalance) public locked;

    //everytime user deposit/withdraw/change_locktime, these values will be updated;
    uint256 public epoch;
    mapping(uint256 => Point) public supplyPointHistory; // epoch -> unsigned point.
    mapping(address => mapping(uint256 => Point)) public userPointHistory; // user -> Point[user_epoch]
    mapping(address => uint256) public userPointEpoch;
    mapping(uint256 => int256) public slopeChanges; // time -> signed slope change


    // ----------- query --------------
    // string public name;
    // string public symbol;
    // uint256 public decimals;

    uint256 public startTime;
    uint256 public timeCursor;

    mapping(uint256 => uint256) public veSupply; // VE total supply at week bounds
    mapping(address => uint256) public timeCursorOf;
    mapping(address => uint256) public userEpochOf;
    mapping(address => uint256) public totalClaimed;

    // ----------- append --------------
    struct ChangesTotalReward {
        address changeUser;
        uint256 beforeTotalReward;
        // uint256 currentTotalReward;
        uint256 ts;
    }

    ChangesTotalReward[] public oldChangesTotalReward;
    
    uint256 public lastUnlockTime;

}