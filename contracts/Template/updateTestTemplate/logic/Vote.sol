//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../data/VoteData.sol";
import "../Interface/IVote.sol";
import "../Interface/IRouterData.sol";
import "../Interface/IRouter.sol";
import "../../../Interface/IFactory.sol";
contract VoteV2 is IVote,VoteDataV2 {

    function initialize() override public{
        veToken = IVeToken(getVeToken());
        router = msg.sender;
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
        string memory voteTopic_,// 投票主题
        string memory describe_,//描述
        uint256  templateID_, // 模板id
        uint256  valaue_ // 金额
         ) external override returns(uint256 voteId){
            // veToken 总量 不能等于0
        require(veToken.totalSupply() != 0, " veTokenSupply == 0");
        // 总量 = veToken总量 * minimumQuantity
        uint256 _totalsupply = veToken.totalSupply() * minimumQuantity / 100;
        // 投票权 比例
        require(veToken.userOfEquity(msg.sender) >= _totalsupply,"Too few tokens are held");
        // 投票数
        voteTatola ++;
        // 赋值
        VoteStruct  storage _VoteStruct = voteMapp[voteTatola];
        // 总量快照
        _VoteStruct.totalsupply = _totalsupply;
        // 投票主题
        _VoteStruct.voteTopic = voteTopic_;
        // 模板ID
        _VoteStruct.voteId = voteTatola;
        // 结束时间
        _VoteStruct.time = block.timestamp + voteTime;
        // 发起人
        _VoteStruct.initiator = msg.sender;
        // 描述
        _VoteStruct.describe = describe_;
        // 状态
        _VoteStruct.status = VoteStatus.isvoting;
        // 模板ID
        _VoteStruct.codeModel = templateID_;
        // 带的钱
        _VoteStruct.value = valaue_;
        
        emit CreateVoteEvent(voteTatola,voteTopic_,describe_,templateID_,valaue_);
        
        return voteTatola;
    }

     //@dev participate in voting 参与投票
    function toVote(uint256 voteId_,bool result_) external override {
        uint256 weight;
        // 投票信息
        VoteStruct storage _vote = voteMapp[voteId_];
        // 状态不能是初始化
        require(_vote.status != VoteStatus.uninitialized,"VoteId is null");
        //In the vote
        // 如果是在投票
        if(_vote.status == VoteStatus.isvoting){
            // 不能重复投票
            require(!_vote.VoterAddress[msg.sender].voted,"Vote before");
            // 判断是否有余额
            require(veToken.userOfEquity(msg.sender) >= 1,"veToken less than 1");
            // 判断是否超出结束时间
            require(block.timestamp < _vote.time,"Not within the allotted time");
            // 已投票
            _vote.VoterAddress[msg.sender].voted = true;
            // 如果委托人不是空
            if(_vote.VoterAddress[msg.sender].bailor.length != 0){
                // 相加委托人的权重
                    for(uint i = 0; i < _vote.VoterAddress[msg.sender].bailor.length; ++i){
                        address deleAdd = _vote.VoterAddress[msg.sender].bailor[i];
                        weight += veToken.userOfEquity(deleAdd);                
                    }
            }
            // 投赞成 或 反对
            if(result_){  
                _vote.supPopel =   weight + veToken.userOfEquity(msg.sender);
            }else{
                _vote.againstPopel =  weight + veToken.userOfEquity(msg.sender);
            }
            //secondBallot 如果是第二轮投票 
        }else if(_vote.status == VoteStatus.secondBallot) {
            // 反对票是否投过
            require(!_vote.svote.VoterAddress[msg.sender].voted,"Vote before");
            // 判断时间
            require(block.timestamp < _vote.time,"Not within the allotted time");
            // 已投票
            _vote.svote.VoterAddress[msg.sender].voted = true;
            // 代理的票数
            if(_vote.VoterAddress[msg.sender].bailor.length != 0){
                // 加一起代理的票数
                for(uint  i = 0; i <  _vote.VoterAddress[msg.sender].bailor.length; ++i){
                    address deleAdd = _vote.VoterAddress[msg.sender].bailor[i];
                    weight += veToken.userOfEquity(deleAdd);
                }
            }
            // 反对的票数
            _vote.svote.supPopel = weight + veToken.userOfEquity(msg.sender);
        }else{
            _vote.svote.againstPopel =  weight + veToken.userOfEquity(msg.sender);
        }
        emit ToVoteEvent(voteId_,result_);
    }
  
    //@dev You can veto a vote if you are not happy with it
    // 开启否决
    function reject(uint256 voteId_,string memory reasons_) external override {
        // 开启比例校验
        uint256 _totalsupply = veToken.totalSupply() * minimumQuantity / 100;
        require(veToken.userOfEquity(msg.sender) >= _totalsupply,"Too few tokens are held");
        // 取得信息
        VoteStruct storage  _vote = voteMapp[voteId_];
        //校验时间 与buffer时间
        require(block.timestamp >= _vote.time && block.timestamp < _vote.time + bufferTime, "Still in the voting phase");
        // 校验 在投票中
        require(_vote.status == VoteStatus.isvoting,"Not at the voting stage");
        // 修改未二次投票 后面在 toVote投票
        _vote.status = VoteStatus.secondBallot;
        //  驳回 信息
        _vote.svote.describe = reasons_;
        //  驳回 发起人
        _vote.svote.vetoer = msg.sender;
        //  结束时间改为驳回时间
        _vote.time = block.timestamp + bufferTime;
        emit RejectEvent(voteId_,reasons_);
    }
    
    // 投票成功后手动执行
    //@dev When the vote is completed, manual click to execute
    function execute(uint256 voteId_) external override {
        // 投票信息
        VoteStruct storage _vote = voteMapp[voteId_];
        // 是否有这个提案
        require(!executeQueueMap[voteId_],"repetitive execution");
        // 提案状态不能为初始化
        require(_vote.status != VoteStatus.uninitialized,"VoteId is null");
        // 如果状态等于
        if(_vote.status == VoteStatus.isvoting){
            // 当前时间大于结束时间加buffer
            // require(block.timestamp > _vote.time + bufferTime,"Still in the voting phase");
            // 投票总数大于百分之三十
            require(_vote.againstPopel+_vote.supPopel >= _vote.totalsupply * 30 / 100,"votes is less than 30 percent");
            // 赞成不超过百分之六十驳回
            require(_vote.supPopel *  100 / (_vote.againstPopel + _vote.supPopel)  >= 60,"Less than 60% of the votes passed");
            // 状态改为成功
             _vote.status = VoteStatus.succeed;
            // 去执行
             _execute(voteId_,_vote.codeModel,_vote.value);
       } else  if(_vote.status == VoteStatus.secondBallot){
            // 时间判断
            require(block.timestamp >= _vote.time,"Still in the voting phase");
            // 判断投票数量没有超过第一次投票赞成
            require(_vote.svote.supPopel >= _vote.supPopel,"The vote passed with fewer votes than the original");
            // 状态改为成功
            _vote.status = VoteStatus.succeed;
            // 执行
            _execute(voteId_,_vote.codeModel,_vote.value);
        }

        emit ExecuteEvent(voteId_);
    } 
    // 执行
    function _execute(uint256 voteId_,uint256 templateID_,uint256 value_)private {
    //    执行队列添加
       executeQueue.push(voteId_);
    //    执行队列表为true
       executeQueueMap[voteId_] = true;
    //    如果开始的是1
       if(templateID_ == 1 ){
        // 设置最小数模板
       getGovernanceTemplateforMinimumQuantity(value_);
    //    如果开始的是2
       }else if (templateID_ == 2){
    //    更改最大质押期限的治理模板
       getGovernanceTemplateforMaxPledgeDuration(value_);
    //    如果开始的是3
       }else if (templateID_ == 3){
        // 更改最大奖励持续时间的治理模板
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

    // 设置最小质押量
    function setMinimumQuantity(uint256 value_)private {
        minimumQuantity = value_;
     }

    function getTemplate()external view  returns(GgovernanceTemplate[] memory re){
        GgovernanceTemplate[]  memory arr = new GgovernanceTemplate[] (3);

        GgovernanceTemplate memory _Template = template[0] ;
        _Template.templateId = 1;
        _Template.functionName = "setMinimumQuantity";
        _Template.toppic = "Modify the minimum number of tokens";
               
        GgovernanceTemplate memory _Template2 = template[1] ;
        _Template2.templateId = 2;
        _Template2.functionName = "updateMaxPledgeDuration";
        _Template2.toppic = "Modify the maximum pledge duration";
        
        GgovernanceTemplate memory _Template3 = template[2] ;
        _Template3.templateId = 3;
        _Template3.functionName = "updateMaxRewardDuration";
        _Template3.toppic = "Modify the maximun pledage reward";
        arr[0] = _Template;
        arr[1] = _Template2;
        arr[2] = _Template3;
        return arr ;
        
    }

    ///@dev Entrust someone else to vote  委托
    function delegateTo(uint256 voteId_,address to_)external override {
        VoteStruct storage  _vote  = voteMapp[voteId_];
        // 验证是否投票过或是否授权过
        require(!_vote.VoterAddress[msg.sender].voted,"Have voted");
        // 不能授权给自己
        require(to_ != msg.sender,"can't delegate to yourself");
        // 订单状态不能是初始化
        require(_vote.status != VoteStatus.uninitialized,"VoteId is null");
        // 需要有余额
        require(veToken.userOfEquity(msg.sender) > 0,"There is no token ");
        // 自己不是被授权
        require(_vote.VoterAddress[msg.sender].bailor.length == 0 ,"No one else can be authorized");
        // 添加授权
        _vote.VoterAddress[to_].bailor.push(msg.sender);
        // 已授权或已投票
        _vote.VoterAddress[msg.sender].voted = true;
        // 添加驳回授权
        _vote.svote.VoterAddress[to_].bailor.push(msg.sender);
        // 驳回授权已投票
        _vote.svote.VoterAddress[msg.sender].voted = true;

        emit DelegateToEvent(voteId_,to_);
    }
    // 获取最小数量的治理模板
    function getGovernanceTemplateforMinimumQuantity(uint256 value_) private {
        // 设置最小数
        setMinimumQuantity(value_);
    }
    // 获取最大质押期限的治理模板
    function getGovernanceTemplateforMaxPledgeDuration(uint256 value_) private {
        _governanceTemplate(address(veToken),"updateMaxPledgeDuration(uint256)",value_);
    }
    // 获取最大奖励持续时间的治理模板
    function getGovernanceTemplateforMaxRewardDuration(uint256 value_) private {
        _governanceTemplate(address(veToken),"updateMaxRewardDuration(uint256)",value_);
    }
    // 模板执行
    function _governanceTemplate(address tarGet,string memory functionName ,uint256  valaue) private {
        (bool _ok, bytes memory returnData) = tarGet.call(abi.encodeWithSignature(functionName,valaue));
        require(_ok, string(returnData));
    }
    // 返回某个投票单的状态
    function getVoteStatuswithVoteId(uint256 voteId_) external view returns (uint256  status){
        VoteStruct storage  _vote = voteMapp[voteId_];
        return uint256(_vote.status);
    }
    //  返回 主题  描述  发起人
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
        // 反对
        forVote = _vote.supPopel;
        // 赞成
        againstVote = _vote.againstPopel;
        // 驳回反对
        forVote2 = _vote.svote.supPopel;
        // 驳回赞成
        againstVote2 = _vote.svote.againstPopel;
        // 结束时间
        time = _vote.time;
    }

}