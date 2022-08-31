//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Interface/ISettings.sol";

contract Settings is Ownable, ISettings {
    /// @notice the maximum auction length
    uint256 public override maxAuctionLength;

    /// @notice the longest an auction can ever be
    uint256 public constant maxMaxAuctionLength = 8 weeks;

    /// @notice the minimum auction length
    uint256 public override minAuctionLength;

    /// @notice the shortest an auction can ever be
    uint256 public constant minMinAuctionLength = 15 minutes;

    /// @notice governance fee max
    uint256 public override governanceFee; 

    /// @notice 10% fee is max
    uint256 public constant maxGovFee = 100; 

    /// @notice max curator fee
    uint256 public override maxCuratorFee; 

    /// @notice the % bid increase required for a new bid
    uint256 public override minBidIncrease; 

    /// @notice 10% bid increase is max
    uint256 public constant maxMinBidIncrease = 100; 

    /// @notice 1% bid increase is min
    uint256 public constant minMinBidIncrease = 10; 

    /// @notice the address who receives auction fees
    address payable public override feeReceiver;

    event UpdateMaxAuctionLength(uint256 old, uint256 new_);

    event UpdateMinAuctionLength(uint256 old, uint256 new_);

    event UpdateGovernanceFee(uint256 old, uint256 new_);

    event UpdateCuratorFee(uint256 old, uint256 new_);

    event UpdateMinBidIncrease(uint256 old, uint256 new_);

    event UpdateFeeReceiver(address old, address new_);

    constructor() {
        maxAuctionLength = 2 weeks;
        minAuctionLength = 15 minutes;
        feeReceiver = payable(0xA2821B9145D989Ff1D2Af196BB8a8296Dacf6CeC);
        minBidIncrease = 50; // 5%
        maxCuratorFee = 100;
        governanceFee = 10;
    }

    function setMaxAuctionLength(uint256 length) external onlyOwner {
        require(length <= maxMaxAuctionLength, "max auction length too high");
        require(length > minAuctionLength, "max auction length too low");

        emit UpdateMaxAuctionLength(maxAuctionLength, length);

        maxAuctionLength = length;
    }

    function setMinAuctionLength(uint256 length) external onlyOwner {
        require(length >= minMinAuctionLength, "min auction length too low");
        require(length < maxAuctionLength, "min auction length too high");

        emit UpdateMinAuctionLength(minAuctionLength, length);

        minAuctionLength = length;
    }

    function setGovernanceFee(uint256 fee) external onlyOwner {
        require(fee <= maxGovFee, "fee too high");

        emit UpdateGovernanceFee(governanceFee, fee);

        governanceFee = fee;
    }

    function setMaxCuratorFee(uint256 fee) external onlyOwner {
        emit UpdateCuratorFee(maxCuratorFee, fee);

        maxCuratorFee = fee;
    }

    function setMinBidIncrease(uint256 min) external onlyOwner {
        require(min <= maxMinBidIncrease, "min bid increase too high");
        require(min >= minMinBidIncrease, "min bid increase too low");

        emit UpdateMinBidIncrease(minBidIncrease, min);

        minBidIncrease = min;
    }

    function setFeeReceiver(address payable receiver) external onlyOwner {
        require(receiver != address(0), "fees cannot go to 0 address");

        emit UpdateFeeReceiver(feeReceiver, receiver);

        feeReceiver = receiver;
    }
}
