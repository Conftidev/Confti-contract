//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
 
import "../Interface//IVeToken.sol";
  contract VoteData{ 
  
    enum VoteStatus {uninitialized, isvoting, succeed,
      faild,bufferTime,secondBallot,executeTime}
 
    //This field records the voting time
    uint256 constant   voteTime = 3 minutes;
    //This field records the counterview
    uint256 constant bufferTime = 4 minutes;
    
    address public router;
    IVeToken public veToken;
    uint public voteTatola;
    uint256[] public  executeQueue;
    uint256  public  templateTotal;
    mapping(uint256 => VoteStruct) voteMapp;
    mapping(uint256=> GgovernanceTemplate) template;
    mapping(uint256 => bool) public executeQueueMap;
    uint256  public minimumQuantity ;
    struct VoteStruct{
        uint256 totalsupply;
        uint256 voteId;
        uint256 time;
        string  voteTopic;
        address initiator;
        string  describe;
        uint256 supPopel;
        uint256 againstPopel;
        VoteStatus status;
        uint256   codeModel;
        uint256   value;
        mapping(address => Delegate)  VoterAddress;
        SecondBallot  svote;
    }                                                                                                                                                                                       
   
    struct SecondBallot {
        address vetoer;
        string describe;
        uint256 supPopel;
        uint256 againstPopel;
        mapping(address => Delegate)  VoterAddress;
    }

    struct Delegate {
        // If true, the voter has voted.。
        bool voted;
        address[] bailor;  
    }
    
    struct GgovernanceTemplate {
        uint256 templateId;
        string toppic;
        string functionName; 
    }
  
}  