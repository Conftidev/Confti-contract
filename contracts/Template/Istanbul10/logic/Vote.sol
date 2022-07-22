//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../data/VoteData.sol";
import "../Interface/IVote.sol";
import "../Interface/IRouterData.sol";
import "../Interface/IRouter.sol";
import "../../../utils/State.sol";
import "../../../Interface/IFactory.sol";
import "../Interface/IVault.sol";
contract Vote is IVote,VoteData {

    function initialize() override public{
        router = msg.sender;
        veToken = IVeToken(getVeToken());
        emit InitializeEvent(router);
    }

    function getVeToken() public view returns(address){
        return  IRouterData(msg.sender).veToken();
    }
    
    // constructor(address veToken_){
    //     veToken = VeTokenTest(veToken_);
    //      router = msg.sender;
    //  }
 
    function createVote(
        string memory voteTopic_,
        string memory describe_,
        uint256  templateID_,
        uint256  valaue_
         ) external override returns(uint256 voteId){
        require(veToken.totalSupply() != 0, " veTokenSupply == 0");
        uint256 _totalsupply = veToken.totalSupply() * minimumQuantity / 100;
        require(veToken.userOfEquity(msg.sender) >= _totalsupply,"Too few tokens are held");
        require(IVault(getVault()).getEntireVaultState() == State.NftState.freedom, "The vault and the auction");
        require(getTemplate().length >= templateID_," template be empty");
 
        voteTatola ++;
        VoteStruct  storage _VoteStruct = voteMapp[voteTatola];
        _VoteStruct.totalsupply = _totalsupply;
        _VoteStruct.voteTopic = voteTopic_;
        _VoteStruct.voteId = voteTatola;
        _VoteStruct.time = block.timestamp + voteTime;
        _VoteStruct.initiator = msg.sender;
        _VoteStruct.describe = describe_;
        _VoteStruct.status = VoteStatus.isvoting;
        _VoteStruct.codeModel = templateID_;
        _VoteStruct.value = valaue_;
        
        emit CreateVoteEvent(voteTatola,voteTopic_,describe_,templateID_,valaue_);
        
        return voteTatola;
    }

     //@dev participate in voting
    function toVote(uint256 voteId_,bool result_) external override {
        uint256 weight;
        VoteStruct storage _vote = voteMapp[voteId_];
        require(_vote.status != VoteStatus.uninitialized,"VoteId is null");
        //In the vote
        if(_vote.status == VoteStatus.isvoting){
        require(!_vote.VoterAddress[msg.sender].voted,"Vote before");
        require(veToken.userOfEquity(msg.sender) >= 1,"veToken less than 1 ");
        require(block.timestamp < _vote.time,"Not within the allotted time");
        _vote.VoterAddress[msg.sender].voted = true;
        
        if(_vote.VoterAddress[msg.sender].bailor.length != 0){
                for(uint i = 0; i < _vote.VoterAddress[msg.sender].bailor.length; ++i){
                    address deleAdd = _vote.VoterAddress[msg.sender].bailor[i];
                    weight += veToken.userOfEquity(deleAdd);
                }
        }
        if(result_){ 
            _vote.supPopel =   weight + veToken.userOfEquity(msg.sender);
        }else{
            _vote.againstPopel =  weight + veToken.userOfEquity(msg.sender);
        }
        //secondBallot
        }else if(_vote.status == VoteStatus.secondBallot) {
            require(!_vote.svote.VoterAddress[msg.sender].voted,"Vote before");
            require(block.timestamp < _vote.time,"Not within the allotted time");
            _vote.svote.VoterAddress[msg.sender].voted = true;
            if(_vote.VoterAddress[msg.sender].bailor.length != 0){
                for(uint  i = 0; i <  _vote.VoterAddress[msg.sender].bailor.length; ++i){
                    address deleAdd = _vote.VoterAddress[msg.sender].bailor[i];
                    weight += veToken.userOfEquity(deleAdd);
                }
            }
          _vote.svote.supPopel = weight + veToken.userOfEquity(msg.sender);
        }else{
            _vote.svote.againstPopel =  weight + veToken.userOfEquity(msg.sender);
        }
        emit ToVoteEvent(voteId_,result_,msg.sender);
    }
  
    //@dev You can veto a vote if you are not happy with it
    function reject(uint256 voteId_,string memory reasons_) external override {
        uint256 _totalsupply = veToken.totalSupply() * minimumQuantity / 100;
        require(veToken.userOfEquity(msg.sender) >= _totalsupply,"Too few tokens are held");

        VoteStruct storage  _vote = voteMapp[voteId_];

        require(block.timestamp >= _vote.time && block.timestamp < _vote.time + bufferTime, "Still in the voting phase");
        require(_vote.status == VoteStatus.isvoting,"Not at the voting stage");

        _vote.status = VoteStatus.secondBallot;
        _vote.svote.describe = reasons_;
        _vote.svote.vetoer = msg.sender;
        _vote.time = block.timestamp + bufferTime;
        emit RejectEvent(voteId_,reasons_);
    }
    
    //@dev When the vote is completed, manual click to execute
    function execute(uint256 voteId_) external override {
        VoteStruct storage _vote = voteMapp[voteId_];
        require(!executeQueueMap[voteId_],"repetitive execution");
        require(_vote.status != VoteStatus.uninitialized,"VoteId is null");
        if(_vote.status == VoteStatus.isvoting){

            require(block.timestamp > _vote.time + bufferTime,"Still in the voting phase");
            require(_vote.againstPopel+_vote.supPopel >= _vote.totalsupply * 30 / 100,"votes is less than 30 percent");
            require(_vote.supPopel *  100 / (_vote.againstPopel + _vote.supPopel)  >= 60,"Less than 60% of the votes passed");
             _vote.status = VoteStatus.succeed;
             _execute(voteId_,_vote.codeModel,_vote.value);
       } else  if(_vote.status == VoteStatus.secondBallot){
            require(block.timestamp >= _vote.time,"Still in the voting phase");
            require(_vote.svote.supPopel >= _vote.supPopel,"The vote passed with fewer votes than the original");
            _vote.status = VoteStatus.succeed;
            _execute(voteId_,_vote.codeModel,_vote.value);
        }else{
            revert("Still in the voting phase");
        }

        emit ExecuteEvent(voteId_);
    } 
    
    function _execute(uint256 voteId_,uint256 templateID_,uint256 value_)private {

       executeQueue.push(voteId_);
       executeQueueMap[voteId_] = true;
       if(templateID_ == 1 ){
       getGovernanceTemplateforMinimumQuantity(value_);
       }else if (templateID_ == 2){
       getGovernanceTemplateforMaxPledgeDuration(value_);
       }else if (templateID_ == 3){
       getGovernanceTemplateforMaxRewardDuration(value_);
       }else if (templateID_ == 4){
        (string memory _name , uint16 _version) = IRouter(router).versionInfo();
        IFactory _factory = IFactory(IRouterData(router).factory());
        address _updataTemplate = _factory.updateUtilsAddres(_name,_version);

        require(_updataTemplate != address(0),"error update template address"); 
        _updateCall(router,"updateRouter(address)",_updataTemplate);
        _updateCall(IRouterData(router).veToken(),"updateVeToken(address)",_updataTemplate);
        _updateCall(IRouterData(router).auction(),"updateAuction(address)",_updataTemplate);
        _updateCall(IRouterData(router).vault(),"updateVault(address)",_updataTemplate);
        updateVote(_updataTemplate); 
       } 
    }

    function updateVote(address _updataTemplate) private{
        (bool _ok, bytes memory returnData) = _updataTemplate.delegatecall(abi.encodeWithSignature(
            "updateVoteUtils()"
        ));

        require(_ok, string(returnData));
    }

    function _updateCall(address tarGet,string memory functionName ,address  valaue) private {
        (bool _ok, bytes memory returnData) = tarGet.call(abi.encodeWithSignature(functionName,valaue));
        require(_ok, string(returnData));
    }

    function setMinimumQuantity(uint256 value_)private {
        minimumQuantity = value_;
     }

    function getTemplate()public view  returns(GgovernanceTemplate[] memory re){
        GgovernanceTemplate[]  memory arr = new GgovernanceTemplate[] (3);

        GgovernanceTemplate memory _Template = template[0];
        _Template.templateId = 1;
        _Template.functionName = "setMinimumQuantity";
        _Template.toppic = "Modify the minimum number of tokens";
               
        GgovernanceTemplate memory _Template2 = template[1];
        _Template2.templateId = 2;
        _Template2.functionName = "updateMaxPledgeDuration";
        _Template2.toppic = "Modify the maximum pledge duration";
        
        GgovernanceTemplate memory _Template3 = template[2];
        _Template3.templateId = 3;
        _Template3.functionName = "updateMaxRewardDuration";
        _Template3.toppic = "Modify the maximun pledage reward";
        arr[0] = _Template;
        arr[1] = _Template2;
        arr[2] = _Template3;
        return arr;
    }

    ///@dev Entrust someone else to vote
    function delegateTo(uint256 voteId_,address to_)external override {
        VoteStruct storage  _vote  = voteMapp[voteId_];

        require(!_vote.VoterAddress[msg.sender].voted,"Have voted");
        require(to_ != msg.sender,"can't delegate to yourself");
        require(_vote.status != VoteStatus.uninitialized,"VoteId is null");
        require(veToken.userOfEquity(msg.sender) > 0,"There is no token ");
        require(_vote.VoterAddress[msg.sender].bailor.length == 0 ,"No one else can be authorized");
 
        _vote.VoterAddress[to_].bailor.push(msg.sender);
        _vote.VoterAddress[msg.sender].voted = true;
        _vote.svote.VoterAddress[to_].bailor.push(msg.sender);
        _vote.svote.VoterAddress[msg.sender].voted = true;

        emit DelegateToEvent(voteId_,to_);
    }

    function getGovernanceTemplateforMinimumQuantity(uint256 value_) private {
        setMinimumQuantity(value_);
    }

    function getGovernanceTemplateforMaxPledgeDuration(uint256 value_) private {
        _governanceTemplate(address(veToken),"updateMaxPledgeDuration(uint256)",value_);
    }

    function getGovernanceTemplateforMaxRewardDuration(uint256 value_) private {
        _governanceTemplate(address(veToken),"updateMaxRewardDuration(uint256)",value_);
    }

    function _governanceTemplate(address tarGet,string memory functionName ,uint256  valaue) private {
        (bool _ok, bytes memory returnData) = tarGet.call(abi.encodeWithSignature(functionName,valaue));
        require(_ok, string(returnData));
    }

    function getVoteStatuswithVoteId(uint256 voteId_) external view returns (uint256  status){
        VoteStruct storage  _vote = voteMapp[voteId_];
        return uint256(_vote.status);
    }
     
    function getVoteDetailwithVoteId(uint256 voteId_) external view returns(
        string memory voteTopic,
        string memory describe,
        address initiator)
        {
         VoteStruct storage _vote = voteMapp[voteId_];
         return  (_vote.voteTopic,_vote.describe,_vote.initiator);
    }

    /// @dev calculates the current winning proposal based on all the current votes
    function winningProposal(uint256 voteId_) external override  view returns(uint256 forVote,
        uint256 againstVote,
        uint256 forVote2,
        uint256 againstVote2,
        uint256 time)
        {
        VoteStruct storage _vote = voteMapp[voteId_];
        forVote = _vote.supPopel;
        againstVote = _vote.againstPopel;
        forVote2 = _vote.svote.supPopel;
        againstVote2 = _vote.svote.againstPopel;
        time = _vote.time;
    }

    function getVault() public view returns(address){
        return IRouterData(router).vault();
    }

}