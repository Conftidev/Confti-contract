//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../data/VoteData.sol";
interface IVote {
    // ///notion initialize for First Creation.
    ///param  _veToken the  value for  connect veToken
    function initialize() external;

    ///notion createVote.
    ///param  codeModel_  GovernanceTemplate ID.
    function createVote(
        string memory voteTopic_,
        string memory describe_,
        string memory link_,
        uint256  codeModel_,
        uint256  valaue_
        ) external returns(uint256);

    ///notion Vote.
    ///param  result_   VoteId
    ///param  voteId_  false or true

    function toVote(uint256 voteId_,bool result_) external;

    ///notion rejecting the proposal.
    ///param  _voteId   VoteId
    ///param  _reasons   The reasons for rejecting the proposal
    function reject(uint256 voteId_,string memory reasons_, string memory link_) external;

    ///notion If the vote passes execute the proposal.
    ///param  voteId_   voteID
    function execute(uint256 voteId_)external;

    ///notion authorize someone else to vote for you
    ///param  to_   authorized person
    function delegateTo(uint256 voteId_,address to_)external;

    //notion voting result
    ///param  voteId_   voteID
    function winningProposal(uint256 voteId_) external view returns(
        uint256 forVote,
        uint256 againstVote,
        uint256 forVote2,
        uint256 againstVote2,
        uint256 time);

    event CreateVoteEvent(
        uint256  voteId_,
        string   voteTopic_,
        address  creator_,
        string  describe_,
        uint256 codeModel_,
        uint256 newValaue_,
        string link_,
        uint256 endTime_,
        uint256 cacheTime_,
        uint256 tokenAmount_,
        uint256 veTokenAmount_
    );

    event InitializeEvent(address indexed  veToken_);
    event ToVoteEvent(uint256 indexed  voteId_, bool result_,address voter,uint256 amount,VoteData.VoteStatus state);
    event RejectEvent(uint256 indexed  voteId_, address creator_, string reasons_,uint256 endTime_,string link_);
    event FailingEvent(uint256 indexed voteId_);
    event ExecuteEvent(uint256 indexed voteId_);
    event DelegateToEvent(uint256 indexed  voteId_, address to_);
    event SetGovernanceTemplateEvent(string topic_, address targetAddress_, string functionName_);
    
}
