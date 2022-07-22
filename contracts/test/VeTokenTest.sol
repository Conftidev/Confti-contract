//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
 
contract VeTokenTest {
  mapping(address => uint256) balance;
  uint256  public circulation;
  uint256 public maxTime;
  // ---------------   Dao Address  ------------------------
  address   public router;

  // ---------------    manage    ----------------------
  bool   public initializer;

  uint256 maxPledgeDuration;
  uint256 maxRewardDuration;

  function pledge()public {
    balance[msg.sender] = 2000;
    circulation += 20 ;
  }

  function balanceOf(address add)public view returns(uint256 result){
      return balance[add];
  }

   function  totalSupply()public view returns(uint256 result){
      return circulation;
  }

   function  setMaxTime(uint256 value)public {
       maxTime = value;
  }

 function updateMaxPledgeDuration(uint256 _maxPledgeDuration) external {
        maxPledgeDuration = _maxPledgeDuration;
  }

  function updateMaxRewardDuration(uint256 _maxRewardDuration) external {
        maxRewardDuration = _maxRewardDuration;
  }

  function initialize() public {
    require(!initializer,"initialize :: Already initialized");
    initializer = !initializer;
    router = msg.sender;
    
}
}