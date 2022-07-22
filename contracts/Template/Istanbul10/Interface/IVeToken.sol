//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVeToken {


    struct Claimable {
        uint256 amount;
        uint256 userEpoch;
        uint256 maxUserEpoch;
        uint256 weekCursor;
        uint256 linearWeeklyRelease;
        uint256[] balanceOfDatas;
        uint256[] veSupplyOfDatas;
        int256[] dtOfDatas;
    }

    event Deposit(
        address indexed provider,
        address indexed beneficiary,
        uint256 value,
        uint256 indexed locktime,
        uint256 _type,
        uint256 ts
    );
    event Withdraw(address indexed provider, uint256 value, uint256 ts);

    event Supply(uint256 prevSupply, uint256 supply);
    
    event Claimed(
        address indexed recipient,
        uint256 amount,
        uint256 claimEpoch,
        uint256 maxEpoch,
        address tokenAddress
    );

    function createLock(uint256 _value, uint256 _unlockTime) external;

    function createLockFor(
        address _beneficiary,
        uint256 _value,
        uint256 _unlockTime
    ) external;

    function increaseAmount(uint256 _value) external;

    function increaseAmountFor(address _beneficiary, uint256 _value) external;

    function increaseUnlockTime(uint256 _unlockTime) external;

    function checkpointSupply() external;

    function withdraw() external;

    // function getLocked(address _addr) external returns (LockedBalance memory);

    function getUserPointEpoch(address _userAddress)
        external
        view
        returns (uint256);

    // function epoch() external view returns (uint256);

    // function getUserPointHistory(address _userAddress, uint256 _index)
    //     external
    //     view
    //     returns (Point memory);

    // function getSupplyPointHistory(uint256 _index)
    //     external
    //     view
    //     returns (Point memory);
    function totalSupply() external view returns (uint256);

    function userOfEquity(address _addr) external view returns (uint256);

    function getLinearWeeklyRelease() external view returns (uint256);

    function updateMaxPledgeDuration(uint256 _maxPledgeDuration) external;

    function updateMaxRewardDuration(uint256 _maxRewardDuration) external;

    function appendTotalReward(uint256 _addReward) external;

    function stopReward() external;
    
    function totalClaimable() external view returns(uint256);
}
