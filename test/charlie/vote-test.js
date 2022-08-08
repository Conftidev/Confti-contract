const { inputToConfig } = require("@ethereum-waffle/compiler");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect, assert, AssertionError } = require("chai");
const { ethers,network,deployments} = require("hardhat");
const { provider } = waffle;
const { utils} = require("ethers");
const { minutes } = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration");

const DELAY_WEEK = 604800; // 1 week 

const gas ={
    gasPrice:1097302934,
    gasLimit:20000000
  }
  
async function moveTime(amount) {
  console.log("Moving blocks increaseTime...")
  await hre.network.provider.send("evm_increaseTime",[amount])
  console.log(`Moved forward in time ${amount} seconds`)
}

async function moveBlock(amount) {
    console.log("Moving blocks...",amount)
    for (let index = 0; index < amount; index++) {
        await hre.network.provider.request({
          method: "evm_mine",
          params: [],
        })
    }
    console.log(`Moved ${amount} blocks`)
}

async function efail(action,name){
    let result = false
    try {
      console.log("异常断言："+name);
      await action.wait()
      result = true;
      console.log("预期异常，但是通过:"+name);
    } catch (error) {
      console.log("预期异常，结果异常:"+name);
    }finally{
      if(result) throw "预期异常, 但是通过:"+name;
    }
  }
  async function epass(action,name){
    try {
      console.log("正确断言："+name);
      await action.wait()
      console.log("预期正确，结果正确:"+name);
    } catch (error) {
      console.log("预期正确，结果错误:"+name);
      throw "预期正确，结果错误:"+name+error;
    }
  }

async function getUser(index){
    const accounts = await hre.ethers.getSigners();
    const user = accounts[index];
    console.log(user.address);
    return user;
}
async function blockInfo(){
    console.log("区块号: ",await provider.getBlockNumber());
    console.log("区块时间: ",(await provider.getBlock()).timestamp);
    return (await provider.getBlock()).timestamp;
}

async function getRouter(factory, routerTemplate,user){

    let mint = await factory.mint(routerTemplate.address,"testx")
    await mint.wait(1);

    const Router = await hre.ethers.getContractFactory("Router"); 
    const router = await Router.attach(factory.lastMint(user.address));
    console.log("mint success, router address:" + await router.address);

    return router.connect(user);
}

async function getIssueRouter(factory, routerTemplate,ntoken,user){
  router = await getRouter(factory, routerTemplate,user);
  const setApprovalForAll= await ntoken.setApprovalForAll(router.vault(),true,gas);
  console.log("【aprove】");
  await setApprovalForAll.wait(1);

  const deposit = await router.curatorDeposit(
    [ntoken.address],
    [1],
    [5]
    ,gas);
  await deposit.wait(1); 
  let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),DELAY_WEEK*20,DELAY_WEEK*5,gas)
  await issue.wait(1); 
  return router;
}

async function stake(token,vetoken,vote,userx,amount){
  let token2 = token.connect(userx)
  let vetoken2 = vetoken.connect(userx)
  let vote2 = vote.connect(userx)

  const transfer = await token.transfer(userx.address,amount)
  await epass(transfer,"transfer")

  //token授权给veToken
  let approve = await token2.approve(vetoken.address,amount);
  await epass(approve,"approve")

  let unLockedTime = await blockInfo() + DELAY_WEEK * 4;
  let createLock = await vetoken2.createLock(amount,unLockedTime,gas);
  await epass(createLock,"createLock")
  return {token2,vetoken2,vote2};
}


describe("测式Vote合约", function () {
  async function deployTokenFixture(){  
        const VeToken = await hre.ethers.getContractFactory("VeToken");
        const veTokenContract = await VeToken.deploy();
        await veTokenContract.deployed();
        console.log("veTokenContract deployed to:", veTokenContract.address);
      
        const Vote = await hre.ethers.getContractFactory("Vote");
        const voteContract = await  Vote.deploy();
        await voteContract.deployed();
        console.log("VoteContract deployed to:", voteContract.address);
      
        const Auction = await hre.ethers.getContractFactory("Auction");
        const auctionContract = await  Auction.deploy();
        await auctionContract.deployed();
        console.log("auctionContract deployed to:", auctionContract.address);
        
        const Vault = await hre.ethers.getContractFactory("Vault");
        const vaultContract = await  Vault.deploy();
        await vaultContract.deployed();
        console.log("vaultContract deployed to:", vaultContract.address);
      
        const Settings = await hre.ethers.getContractFactory("Settings");
        const SettingsContract = await Settings.deploy();
        await SettingsContract.deployed();
        console.log("veTokenContract deployed to:", SettingsContract.address);
      
        const Factory = await hre.ethers.getContractFactory("Factory"); 
        const factoryContract = await  Factory.deploy(SettingsContract.address);
        await factoryContract.deployed();
        console.log("factoryContract deployed to:", factoryContract.address);

        const Division = await hre.ethers.getContractFactory("Division"); 
        const divisionContract = await  Division.deploy();
        await divisionContract.deployed();
        console.log("divisionContract deployed to:", divisionContract.address);
      
        const Router = await hre.ethers.getContractFactory("Router"); 
        const routerContract = await Router.deploy(veTokenContract.address,vaultContract.address,auctionContract.address,voteContract.address,divisionContract.address);
        await routerContract.deployed();
        console.log("routerContract deployed to:", routerContract.address);
      
        let setLogic = await factoryContract.setLogic(routerContract.address,true,gas)
        await setLogic.wait(1);  
        console.log("setLogic true");

        const user = await getUser(1);
        const user_addr = await user.address;

        const ufactory = factoryContract.connect(user);
        
        const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
        const ntokenx = await  TestERC11555.deploy();
        console.log("ntoken:"+ntokenx.address)
        const ntoken = ntokenx.connect(user);

        const mint1 = await ntoken.mintBatch(user_addr,10,gas);
        await mint1.wait(1);
        console.log("ntoken 1 success:" + await ntoken.address);

        const router = await getIssueRouter(ufactory,routerContract,ntoken,user);      
        const vault = await Vault.attach(router.vault()).connect(user);
        const vetoken = await VeToken.attach(router.veToken()).connect(user);
        const vote = await Vote.attach(router.vote()).connect(user);
        const auction = await Auction.attach(router.auction()).connect(user);
        const token = await Division.attach(router.division()).connect(user);
        console.log(await vault.address);
        console.log(await vetoken.address);
        console.log(await auction.address);
        console.log(await token.address);
        console.log(await vote.address);


        const amount = ethers.utils.parseUnits("4500");
        console.log("amount=",amount);
        const mybalance = await token.balanceOf(user.address)
        console.log("个人token余额: ",ethers.utils.formatEther(mybalance));

        //token授权给veToken
        const approveTx = await token.approve(vetoken.address,amount);
        const approveResult =  await approveTx.wait();
        console.log("授权成功！");

        const unLockedTime = await blockInfo() + DELAY_WEEK * 10;
        const tx = await vetoken.createLock(amount,unLockedTime);
        await tx.wait(1);
        console.log("质押成功");
        

        return {router,vault,vetoken,auction,token,vote,user,ntoken,ufactory,routerContract};
    }


    it("createVote: 创建调整发起提案的vetoken持有要求应成功", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,10,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      const  execute = await vote.execute(1,gas);
      console.log(await vetoken.userOfEquity(user.address))
      await epass(execute,"执行")

      // 验证修改
      const amount = ethers.utils.parseUnits("400")
      const user2 = await getUser(2)

      const {token2,vetoken2,vote2} = await stake(token,vetoken,vote,user2,amount);
      let unLockedTime = await blockInfo();
      let increaseUnlockTime = await vetoken2.increaseUnlockTime(unLockedTime + DELAY_WEEK*10);
      await increaseUnlockTime.wait(1);
      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken2.userOfEquity(user2.address));
      console.log(await vetoken.totalSupplyAt(await provider.getBlockNumber()));

      console.log("当前最低质押比例"+await vote.minimumQuantity());

      let tx = await vote2.createVote("xx","setVeTokenAmount","xx",1,1,gas);
      await efail(tx,"createVote");
      
    });
    it("创建调整最长质押时长的提案应成功", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",2,DELAY_WEEK*10,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      const  execute = await vote.execute(1,gas);
      await epass(execute,"执行")

      // 验证
      let maxPledgeDuration = await vetoken.maxPledgeDuration();
      console.log(maxPledgeDuration);
      expect(maxPledgeDuration).to.equal(DELAY_WEEK*10);
      
    });
    it("创建调整质押奖励时长的提案应成功", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",3,DELAY_WEEK*10,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      const  execute = await vote.execute(1,gas);
      await epass(execute,"执行")

      // 验证
      let maxRewardDuration = await vetoken.maxRewardDuration();
      console.log(maxRewardDuration);
      expect(maxRewardDuration).to.equal(DELAY_WEEK*10);

    });
    xit("质押奖励时长小于当前时长,应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      let timestamp = await blockInfo();
      let tx = await vote.createVote("xx","3 updateMaxRewardDuration","xx",3,DELAY_WEEK,gas);
      await efail(tx);

    });
    xit("创建 设置拍卖价格提案应成功", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const price = ethers.utils.parseUnits("10")
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",5,price,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      const  execute = await vote.execute(1,gas);
      await epass(execute,"执行")
    });
    xit("createVote: 模板ID = 0 应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      let tx = await vote.createVote("xx","setVeTokenAmount","xx",0,3,gas);await efail(tx,"xx");

    });
    xit("createVote: 模板ID = 6 应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      let tx = await vote.createVote("xx","setVeTokenAmount","xx",6,3,gas);await efail(tx,"xx");
    });
    xit("持有vetoken 占比小于(提案最小持币要求)应提交失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("1")
      const user2 = await getUser(2)

      const {token2,vetoken2,vote2} = await stake(token,vetoken,vote,user2,amount);

      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken2.userOfEquity(user2.address));

      let tx = await vote2.createVote("xx","setVeTokenAmount","xx",1,1,gas);await efail(tx,"xx");
    });
    // xit("createvote:redeem后操作，应失败", async function(){
    //   const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
    //   await vault.redeem();

    //   let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",2,DELAY_WEEK*15,gas);
    //   await efail(createVote,"xx");
    // });
    xit("createVote:已开启拍卖,操作应失败",async function(){
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);


      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await a2.start({value : utils.parseUnits("1.1",18)})
      console.log("start")
  
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await efail(createVote,"xx");

    });
    xit("createVote:拍卖结束，操作应失败",async function(){
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);

      await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      await auction.end();
      console.log("END");
     
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await efail(createVote,"xx");

    });

    xit("toVote: 投赞成票应成功", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);

    });
    xit("toVote: 投票总量累计", async function(){
      const {router,vault,vetoken,auction,token,vote,user,ufactory,ntoken,routerContract} = await loadFixture(deployTokenFixture);
      
      const user3 = await getUser(3);
      const router1 = await getIssueRouter(ufactory,routerContract,ntoken,user)
      const Vault = await hre.ethers.getContractFactory("Vault"); 
      const VeToken = await hre.ethers.getContractFactory("VeToken"); 
      const Vote = await hre.ethers.getContractFactory("Vote"); 
      const Auction = await hre.ethers.getContractFactory("Auction"); 
      const Division = await hre.ethers.getContractFactory("Division"); 

      const vault2 = await Vault.attach(router1.vault()).connect(user);
      const vetoken2 = await VeToken.attach(router1.veToken()).connect(user);
      const vote2 = await Vote.attach(router1.vote()).connect(user);
      const auction2 = await Auction.attach(router1.auction()).connect(user);
      const token2 = await Division.attach(router1.division()).connect(user);

      const vault3 = await Vault.attach(router1.vault()).connect(user3);
      const vetoken3 = await VeToken.attach(router1.veToken()).connect(user3);
      const vote3 = await Vote.attach(router1.vote()).connect(user3);
      const auction3 = await Auction.attach(router1.auction()).connect(user3);
      const token3 = await Division.attach(router1.division()).connect(user3);
      console.log(await vault.address);
      console.log(await vetoken.address);
      console.log(await auction.address);
      console.log(await token.address);
      console.log(await vote.address);

      const amount = ethers.utils.parseUnits("2000");
      console.log("amount=",amount);
      await stake(token2,vetoken2,vote2,user3,amount);

      const mybalance = await token2.balanceOf(user.address)
      console.log("个人token余额: ",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      const approveTx = await token2.approve(vetoken2.address,amount);
      const approveResult =  await approveTx.wait();
      console.log("授权成功！");

      const unLockedTime = await blockInfo() + DELAY_WEEK * 4;
      const tx = await vetoken2.createLock(amount,unLockedTime);
      await tx.wait(1);
      console.log("质押成功");

      let createVote2  = await vote2.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote2,"提案")


      let user1_vbalance = await vetoken2.userOfEquity(user.address)
      let user3_vbalance = await vetoken2.userOfEquity(user3.address)
      let sum = BigInt(user1_vbalance) + BigInt(user3_vbalance);

      console.log(user1_vbalance)

      console.log(user3_vbalance)



      let toVote2  = await vote2.toVote(1,true,gas);
      await epass(toVote2,"投票 1")
      
      const result2  = await vote2.winningProposal(1);
      console.log(result2);


      let toVote3  = await vote3.toVote(1,true,gas);
      await epass(toVote3,"投票 2")
      
      const result3  = await vote3.winningProposal(1);
 
      let forVote = BigInt(result3["forVote"]);
      console.log(forVote);
      console.log(sum);
      console.log(forVote - sum);
      console.log(forVote < sum)
      expect(true).to.equal(forVote < sum);
      expect(true).to.equal(forVote > sum/100n*99n);
    });
    xit("toVote: 投反对票应成功", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,false,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);

    });
    xit("toVote: id错误，应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(10,false,gas);
      let tx = await vote.toVote(10,false,gas);await efail(tx,"xx");

    });
    xit("toVote: 已投票，应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote1  = await vote.toVote(1,false,gas);
      await epass(toVote1,"投票")

      let tx = await vote.toVote(1,false,gas);
      await efail(tx,"tovote");
    });
    xit("toVote: vetoken 小于1应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      const amount = ethers.utils.parseUnits("1",17)
      const user2 = await getUser(2)
      
      const {token2,vetoken2,vote2} = await stake(token,vetoken,vote,user2,amount);

      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken2.userOfEquity(user2.address));

 
      let tx = await  vote2.toVote(1,true,gas);
      await efail(tx,"xx");

    });
    xit("toVote: 缓冲期投票应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      await moveTime(5*60);

      let tx = await  vote.toVote(1,true,gas);;await efail(tx,"xx");
    });

    xit("toVote:已开启拍卖,操作应失败",async function(){
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);

      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")


      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await a2.start({value : utils.parseUnits("1.1",18)})
      console.log("start")
  
      let tx = await  vote.toVote(1,true,gas);
      await efail(tx,"xx");

    });
    xit("toVote:拍卖结束，操作应失败",async function(){
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);

      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")


      await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      await auction.end();
      console.log("END");
     
      let tx = await  vote.toVote(1,true,gas);
      await efail(tx,"xx");

    });

    xit("toVote: 执行期投票应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      await moveTime(10*60);
      

      let tx = await  vote.toVote(1,true,gas);;await efail(tx,"xx");

    });


    xit("toVote: 已执行，应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      const  execute = await vote.execute(1,gas);
      console.log(await vetoken.userOfEquity(user.address))
      await epass(execute,"执行")

      let tx = await  vote.toVote(1,true,gas);await efail(tx,"tovote");
      
    });

  xit("reject: 正常流程", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(4*60);
      await moveBlock(1);
      
      let reject  = await vote.reject(1,"xx",gas);
      await epass(reject,"否决")

      const amount = ethers.utils.parseUnits("100",18)
      const user2 = await getUser(2)
      
      const {token2,vetoken2,vote2} = await stake(token,vetoken,vote,user2,amount);

      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken2.userOfEquity(user2.address));

      let toVote2  = await vote2.toVote(1,true,gas);
      await epass(toVote2,"否决赞成投票")

      let toVote3  = await vote.toVote(1,false,gas);
      await epass(toVote3,"否决反对投票")

      
      const result2  = await vote.winningProposal(1);
      console.log(result2);
    });
    
    xit("reject: 正常流程-false", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(4*60);
      await moveBlock(1);
      
      let reject  = await vote.reject(1,"xx",gas);
      await epass(reject,"否决")

      const amount = ethers.utils.parseUnits("100",18)
      const user2 = await getUser(2)
      
      const {token2,vetoken2,vote2} = await stake(token,vetoken,vote,user2,amount);

      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken2.userOfEquity(user2.address));

      let toVote2  = await vote.toVote(1,false,gas);
      await epass(toVote2,"投票")
      const result2  = await vote.winningProposal(1);
      console.log(result2);
    });

    xit("reject:已开启拍卖,操作应失败",async function(){
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);

      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")

      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(5*60);
      await moveBlock(1);
      

      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await a2.start({value : utils.parseUnits("1.1",18)})
      console.log("start")
  
      try {
        await vote.reject(1,"xx",gas);
        throw 1
      } catch (error) {
        if(error==1) throw "异常断言，失败"
      }

    });
    xit("reject:拍卖结束，操作应失败",async function(){
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);

      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")

      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(5*60);
      await moveBlock(1);
      


      await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      await auction.end();
      console.log("END");
     
      try {
        await vote.reject(1,"xx",gas);
        throw 1
      } catch (error) {
        if(error==1) throw "异常断言，失败"
      }
    });
    
    xit("reject: 投票期否决,应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(1*60);
      await moveBlock(1);
      
      try {
        await vote.reject(1,"xx",gas);
        throw 1
      } catch (error) {
        if(error==1) throw "异常断言，失败"
      }
      });
    xit("reject: 提案失败,否决应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(5*60);
      await moveBlock(1);
      
      // let tx = await vote.reject(1,"xx",gas);await efail(tx,"xx");
      try {
        await vote.reject(1,"xx",gas);
        throw 1
      } catch (error) {
        if(error==1) throw "异常断言，失败"
      }

    });
    xit("reject: 已否决,再次提交应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")

      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(5*60);
      await moveBlock(1);
      
      let reject  = await vote.reject(1,"xx",gas);
      await epass(reject,"否决");

      try {
        await vote.reject(1,"xx",gas);
        throw 1
      } catch (error) {
        if(error==1) throw "异常断言，失败"
      }
    });
    xit("reject: 执行期否决，应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(10*60);
      await moveBlock(1);

      try {
        await vote.reject(1,"xx",gas);
        throw 1
      } catch (error) {
        if(error==1) throw "异常断言，失败"
      }
      
    });
    xit("reject: 已执行,提交否决,应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      const  execute = await vote.execute(1,gas);
      console.log(await vetoken.userOfEquity(user.address))
      await epass(execute,"执行")
      
      try {
        await vote.reject(1,"xx",gas);
        throw 1
      } catch (error) {
        if(error==1) throw "异常断言，失败"
      }
    });

    xit("execute:提案id不存在应失败 ", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let tx = await  vote.execute(1,gas);;await efail(tx,"xx");


    });
    xit("execute:投票期执行,应失败 ", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
    
      console.log(await vetoken.userOfEquity(user.address))
      let tx = await  vote.execute(1,gas);;await efail(tx,"xx");
    
    });
    xit("execute:缓冲期执行应失败 ", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(5*60);
      await moveBlock(1);

      console.log(await vetoken.userOfEquity(user.address))
      let tx = await  vote.execute(1,gas);;await efail(tx,"xx");

    });
    xit("execute:否决提案赞同票小于提案赞同票,提案还是成功 ", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100")
      const user2 = await getUser(2)

      const {token2,vetoken2,vote2} = await stake(token,vetoken,vote,user2,amount);

      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken2.userOfEquity(user2.address));


      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(5*60);
      await moveBlock(1);

      let reject  = await vote.reject(1,"xx",gas);
      await epass(reject,"否决");

      
      let toVote2  = await vote2.toVote(1,true,gas);
      await epass(toVote2,"否决提案赞同投票")

      await moveTime(8*60);
      await moveBlock(1);

      const  execute = await vote.execute(1,gas);
      console.log(await vetoken.userOfEquity(user.address))
      await epass(execute,"执行")
    
    });
    xit("execute:否决提案赞同票大于提案赞同票,提案改为失败 ", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100")
      const user2 = await getUser(2)

      const {token2,vetoken2,vote2} = await stake(token,vetoken,vote,user2,amount);

      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken2.userOfEquity(user2.address));


      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      await moveTime(2*60);
      await moveBlock(1);



      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")

      const resulta  = await vote.winningProposal(1);
      console.log("大户投票");
      console.log(resulta);

      // let toVotea  = await vote2.toVote(1,true,gas);
      // await epass(toVotea,"投票")

      // const resultb  = await vote.winningProposal(1);
      // console.log("韭菜投票");
      // console.log(resultb);

      
      await moveTime(2*60);
      await moveBlock(1);

      let reject2  = await vote.reject(1,"xx",gas);
      await epass(reject2,"否决");

      console.log(await vetoken.userOfEquity(user.address))

      let increaseUnlockTime = await vetoken.increaseUnlockTime(await blockInfo() + DELAY_WEEK*20);
      await increaseUnlockTime.wait(1);


      
      let toVote3  = await vote.toVote(1,true,gas);
      await epass(toVote3,"否决提案赞同投票")
      console.log("大户投票否决");

      const result1  = await vote.winningProposal(1);
      console.log(result1);
     

      // let toVote2  = await vote2.toVote(1,true,gas);
      // await epass(toVote2,"否决提案赞同投票")
      // console.log("韭菜投票否决");
      
      // const result2  = await vote2.winningProposal(1);
      // console.log(result2);

     
      await moveTime(5*60);
      await moveBlock(1);

      console.log(await vetoken.userOfEquity(user.address))
      let tx = await  vote.execute(1,gas);;await efail(tx,"xx");
   
    });
    xit("execute:提案投票数量小于总量30%,提案失败 ", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("100")
      const user2 = await getUser(2)

      const {token2,vetoken2,vote2} = await stake(token,vetoken,vote,user2,amount);

      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken2.userOfEquity(user2.address));

      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote2.toVote(1,true,gas);
      await epass(toVote,"投票")

      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(9*60);
      await moveBlock(1);

      console.log(await vetoken.userOfEquity(user.address))
      let tx = await  vote.execute(1,gas);;await efail(tx,"xx");
   
    });
    xit("execute: 已开启拍卖，应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      let start = await a2.start({value : utils.parseUnits("1.1",18)})
      await start.wait(1);
      console.log("start")

      const  execute = await vote.execute(1,gas);
      console.log(await vetoken.userOfEquity(user.address))
      await efail(execute,"执行")
      
    });
    xit("execute: 已结束拍卖，应执行失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let toVote  = await vote.toVote(1,true,gas);
      await epass(toVote,"投票")
      
      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(8*60);
      await moveBlock(1);

      await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      let end = await auction.end();
      await end.wait(1);
      console.log("END");

      const  execute = await vote.execute(1,gas);
      console.log(await vetoken.userOfEquity(user.address))
      await efail(execute,"执行")
      
    });
    xit("delegateTo:授权其他地址投票 （被授权人有vetoken，投票应成功）", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100")
      const user2 = await getUser(2)

      const {token2,vetoken2,vote2} = await stake(token,vetoken,vote,user2,amount);

      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken2.userOfEquity(user2.address));

      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let delegateTo = await vote.delegateTo(1,user2.address);
      await epass(delegateTo,"授权")

      let toVote  = await vote2.toVote(1,true,gas);
      await epass(toVote,"投票")

      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(9*60);
      await moveBlock(1);

      const  execute = await vote.execute(1,gas);
      console.log(await vetoken.userOfEquity(user.address))
      await epass(execute,"执行")
   
    });
    xit("delegateTo:授权其他地址投票(被授权人无vetoken，投票应失败) ", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100")
      const user2 = await getUser(2)


      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken.userOfEquity(user2.address));

      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let delegateTo = await vote.delegateTo(1,user2.address);
      await epass(delegateTo,"授权")

      let vote2 = vote.connect(user2);
      let toVote2  = await vote2.toVote(1,true,gas);
      await efail(toVote2,"toVote2");
    });

    xit("delegateTo:授权其他地址投票，自己投票应失败 ", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100")
      const user2 = await getUser(2)

      const {token2,vetoken2,vote2} = await stake(token,vetoken,vote,user2,amount);

      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken.userOfEquity(user2.address));

      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let delegateTo = await vote.delegateTo(1,user2.address);
      await epass(delegateTo,"授权")

      
      let toVote = await vote.toVote(1,true,gas);
      await efail(toVote,"toVote");

      let toVote2  = await vote2.toVote(1,true,gas);
      await epass(toVote2,"被授权人投票")

      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(9*60);
      await moveBlock(1);

      const  execute = await vote.execute(1,gas);
      console.log(await vetoken.userOfEquity(user.address))
      await epass(execute,"执行")
   
    });

    xit("delegateTo:授权其他地址投票 授权人无vetoken 应失败", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
          
      const amount = ethers.utils.parseUnits("100")
      const user2 = await getUser(2)


      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken.userOfEquity(user2.address));

      const createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      try{vote2.delegateTo(1,user.address);throw 1}catch(error){if(error==1)throw("预期异常,实际通过：delegateTo")}

    });

    xit("delegateTo:多人授权，投票应成功）", async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      
      const amount = ethers.utils.parseUnits("100")
      const user2 = await getUser(2);
      const user3 = await getUser(3)
      const user4 = await getUser(4)

      await stake(token,vetoken,vote,user2,amount);
      await stake(token,vetoken,vote,user3,amount);
      await stake(token,vetoken,vote,user4,amount);

      v2 = vote.connect(user2);
      v3 = vote.connect(user3);
      v4 = vote.connect(user4);

      console.log(await vetoken.userOfEquity(user.address));
      console.log(await vetoken.userOfEquity(user2.address));
      console.log(await vetoken.userOfEquity(user3.address));
      console.log(await vetoken.userOfEquity(user4.address));

      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",1,3,gas);
      await epass(createVote,"提案")

      let delegateTo1 = await vote.delegateTo(1,user2.address);
      await epass(delegateTo1,"授权1")
      let delegateTo3 = await v3.delegateTo(1,user2.address);
      await epass(delegateTo3,"授权3")
      let delegateTo4 = await v4.delegateTo(1,user2.address);
      await epass(delegateTo4,"授权4")

      let toVote  = await v2.toVote(1,true,gas);
      await epass(toVote,"投票")

      const result  = await vote.winningProposal(1);
      console.log(result);
     
      await moveTime(9*60);
      await moveBlock(1);

      const  execute = await vote.execute(1,gas);
      console.log(await vetoken.userOfEquity(user.address))
      await epass(execute,"执行")
   
    });


});