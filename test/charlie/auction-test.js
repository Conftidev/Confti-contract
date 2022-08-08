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
      console.log("预期异常,但是通过:"+name);
    } catch (error) {
      console.log("预期异常,结果异常:"+name);
    }finally{
      if(result) throw "预期异常, 但是通过:"+name;
    }
  }
  async function epass(action,name){
    try {
      console.log("正确断言："+name);
      await action.wait()
      console.log("预期正确,结果正确:"+name);
    } catch (error) {
      console.log("预期正确,结果错误:"+name);
      throw "预期正确,结果错误:"+name;
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

  let unLockedTime = Date.parse(new Date())/1000 + DELAY_WEEK * 4;
  let createLock = await vetoken2.createLock(amount,unLockedTime);
  await epass(createLock,"createLock")
  return {token2,vetoken2,vote2};
}


describe("测式Auction合约", function () {
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

        user = await getUser(1);
        user_addr = await user.address;
        console.log("ntoken:"+user_addr)


        const ufactory = factoryContract.connect(user);
        
        const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
        let ntoken = await  TestERC11555.deploy();
        console.log("ntoken:"+ntoken.address)
        ntoken = ntoken.connect(user);

        const mint1 = await ntoken.mintBatch(user_addr,10,gas);
        await mint1.wait(1);
        console.log("ntoken 1 success:" + await ntoken.address);

        let router = await getIssueRouter(ufactory,routerContract,ntoken,user);      
        let vault = await Vault.attach(router.vault()).connect(user);
        let vetoken = await VeToken.attach(router.veToken()).connect(user);
        let vote = await Vote.attach(router.vote()).connect(user);
        let auction = await Auction.attach(router.auction()).connect(user);
        let token = await Division.attach(router.division()).connect(user);
        console.log(await vault.address);
        console.log(await vetoken.address);
        console.log(await auction.address);
        console.log(await token.address);
        console.log(await vote.address);


        const amount = ethers.utils.parseUnits("4500");
        console.log("amount=",amount);
        let mybalance = await token.balanceOf(user.address)
        console.log("个人token余额: ",ethers.utils.formatEther(mybalance));

        //token授权给veToken
        let approveTx = await token.approve(vetoken.address,amount);
        let approveResult =  await approveTx.wait();
        console.log("授权成功！");

        let unLockedTime = await blockInfo() + DELAY_WEEK * 10;
        let tx = await vetoken.createLock(amount,unLockedTime);
        await tx.wait(1);
        console.log("质押成功");
        

        return {router,vault,vetoken,auction,token,vote,user};
    }

    it("start:正常流程",async function(){
      const {router,vault,vetoken,auction,token,vote,user} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")


      let auctionStart = await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")
      let log = await auctionStart.wait(); 

      console.log("check start ----start")
      let {timestamp} = await ethers.provider.getBlock(log.blockNumber)  
      let auctionLength = await auction.auctionLength();
      let auctionInfoAfter = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoAfter.price))).to.equal(1); 
      console.log("price ok")
      expect(Number(auctionInfoAfter.auctionEnd)).to.equal(Number(auctionLength) + Number(timestamp)); 
      console.log("auctionEnd ok")
      expect(Number(utils.formatEther(auctionInfoAfter.livePrice))).to.equal(1.1); 
      console.log("livePrice ok")
      expect(auctionInfoAfter.winning).to.equal(await user.address);
      console.log("winning ok")
      console.log("check start ----end")

      let beforeethBalance = Number(utils.formatEther(await provider.getBalance(await user.address))); 

      try{await auction.bid({value : utils.parseUnits("1.0",18)});throw 1}catch(error){if(error==1)throw("预期异常,实际通过：bid")}

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      let end = await auction.end();
      await epass(end,"END");
    });

    it("start: 开启拍卖价格=起拍价,应成功",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")


      let auctionStart = await auction.start({value : utils.parseUnits("1",18)})
      console.log("start function")
      let log = await auctionStart.wait(); 

      console.log("check start ----start")
      let {timestamp} = await ethers.provider.getBlock(log.blockNumber)  
      let auctionLength = await auction.auctionLength();
      let auctionInfoAfter = await auction.auctions(0);
      expect(Number(utils.formatEther(auctionInfoAfter.price))).to.equal(1); 
      console.log("price ok")
      expect(Number(auctionInfoAfter.auctionEnd)).to.equal(Number(auctionLength) + Number(timestamp)); 
      console.log("auctionEnd ok")
      expect(Number(utils.formatEther(auctionInfoAfter.livePrice))).to.equal(1); 
      console.log("livePrice ok")
      expect(auctionInfoAfter.winning).to.equal(await user.address);
      console.log("winning ok")
      console.log("check start ----end")
    });

    it("start,价格小于起拍价,应失败",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")

      try{await auction.start({value : utils.parseUnits("0.99",18)});throw 1}catch(error){if(error==1)throw("预期异常,实际通过：start")}

    });

    
    it("start,价格=0,应失败",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")


      try{await auction.start({value : utils.parseUnits("0",18)});throw 1}catch(error){if(error==1)throw("预期异常,实际通过：start")}

    });


    it("bid:正常竞价",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")


      let auctionStart = await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")
      let log = await auctionStart.wait(); 

      console.log("check start ----start")
      let {timestamp} = await ethers.provider.getBlock(log.blockNumber)  
      let auctionLength = await auction.auctionLength();
      let auctionInfoAfter = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoAfter.price))).to.equal(1); 
      console.log("price ok")
      expect(Number(auctionInfoAfter.auctionEnd)).to.equal(Number(auctionLength) + Number(timestamp)); 
      console.log("auctionEnd ok")
      expect(Number(utils.formatEther(auctionInfoAfter.livePrice))).to.equal(1.1); 
      console.log("livePrice ok")
      expect(auctionInfoAfter.winning).to.equal(await user.address);
      console.log("winning ok")
      console.log("check start ----end")

      let beforeethBalance = Number(utils.formatEther(await provider.getBalance(await user.address))); 

      let auctionbid =  await auction.bid({value : utils.parseUnits("1.2",18)});
      await epass(auctionbid,"bid");

      console.log("check start ----start")
      auctionLength = await auction.auctionLength();
      auctionInfoAfter = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoAfter.price))).to.equal(1); 
      console.log("price ok")
      expect(Number(utils.formatEther(auctionInfoAfter.livePrice))).to.equal(1.2); 
      console.log("livePrice ok")
      expect(auctionInfoAfter.winning).to.equal(await user.address);
      console.log("winning ok")
      console.log("check start ----end")

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      let end = await auction.end();
      await epass(end,"END");
    });

    it("bid,小于当前价格,应失败",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")


      let auctionStart = await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")
      let log = await auctionStart.wait(); 

      console.log("check start ----start")
      let {timestamp} = await ethers.provider.getBlock(log.blockNumber)  
      let auctionLength = await auction.auctionLength();
      let auctionInfoAfter = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoAfter.price))).to.equal(1); 
      console.log("price ok")
      expect(Number(auctionInfoAfter.auctionEnd)).to.equal(Number(auctionLength) + Number(timestamp)); 
      console.log("auctionEnd ok")
      expect(Number(utils.formatEther(auctionInfoAfter.livePrice))).to.equal(1.1); 
      console.log("livePrice ok")
      expect(auctionInfoAfter.winning).to.equal(await user.address);
      console.log("winning ok")
      console.log("check start ----end")

      let beforeethBalance = Number(utils.formatEther(await provider.getBalance(await user.address))); 

      try{await auction.bid({value : utils.parseUnits("1",18)});throw 1}catch(error){if(error==1)throw("预期异常,实际通过：bid")}

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      let end = await auction.end();
      await epass(end,"END");
    });

    it("bid,等于当前价格应失败",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")


      let auctionStart = await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")
      let log = await auctionStart.wait(); 

      console.log("check start ----start")
      let {timestamp} = await ethers.provider.getBlock(log.blockNumber)  
      let auctionLength = await auction.auctionLength();
      let auctionInfoAfter = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoAfter.price))).to.equal(1); 
      console.log("price ok")
      expect(Number(auctionInfoAfter.auctionEnd)).to.equal(Number(auctionLength) + Number(timestamp)); 
      console.log("auctionEnd ok")
      expect(Number(utils.formatEther(auctionInfoAfter.livePrice))).to.equal(1.1); 
      console.log("livePrice ok")
      expect(auctionInfoAfter.winning).to.equal(await user.address);
      console.log("winning ok")
      console.log("check start ----end")

      let beforeethBalance = Number(utils.formatEther(await provider.getBalance(await user.address))); 

      try{await auction.bid({value : utils.parseUnits("1.1",18)});throw 1}catch(error){if(error==1)throw("预期异常,实际通过:")}

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      let end = await auction.end();
      await epass(end,"END");
    });

    it("bid,竞价幅度小于5%,应失败",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")


      let auctionStart = await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")
      let log = await auctionStart.wait(); 

      console.log("check start ----start")
      let {timestamp} = await ethers.provider.getBlock(log.blockNumber)  
      let auctionLength = await auction.auctionLength();
      let auctionInfoAfter = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoAfter.price))).to.equal(1); 
      console.log("price ok")
      expect(Number(auctionInfoAfter.auctionEnd)).to.equal(Number(auctionLength) + Number(timestamp)); 
      console.log("auctionEnd ok")
      expect(Number(utils.formatEther(auctionInfoAfter.livePrice))).to.equal(1.1); 
      console.log("livePrice ok")
      expect(auctionInfoAfter.winning).to.equal(await user.address);
      console.log("winning ok")
      console.log("check start ----end")

      let beforeethBalance = Number(utils.formatEther(await provider.getBalance(await user.address))); 

      try{await auction.bid({value : utils.parseUnits("1.05",18)});throw 1}catch(error){if(error==1)throw("预期异常,实际通过:bid")}

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      let end = await auction.end();
      await epass(end,"END");
    });

    it("bid:未开始拍卖,应失败",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")

      try{await auction.bid({value : utils.parseUnits("1.1",18)});throw 1}catch(error){if(error==1)throw("预期异常,实际通过:bid")}

    });

    it("bid,已结束拍卖,应失败",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")


      let auctionStart = await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")
      let log = await auctionStart.wait(); 

      console.log("check start ----start")
      let {timestamp} = await ethers.provider.getBlock(log.blockNumber)  
      let auctionLength = await auction.auctionLength();
      let auctionInfoAfter = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoAfter.price))).to.equal(1); 
      console.log("price ok")
      expect(Number(auctionInfoAfter.auctionEnd)).to.equal(Number(auctionLength) + Number(timestamp)); 
      console.log("auctionEnd ok")
      expect(Number(utils.formatEther(auctionInfoAfter.livePrice))).to.equal(1.1); 
      console.log("livePrice ok")
      expect(auctionInfoAfter.winning).to.equal(await user.address);
      console.log("winning ok")
      console.log("check start ----end")

      let beforeethBalance = Number(utils.formatEther(await provider.getBalance(await user.address))); 

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      let end = await auction.end();
      await epass(end,"END");

      
      try{await auction.bid({value : utils.parseUnits("1.5",18)});throw 1}catch(error){if(error==1)throw("预期异常,实际通过:bid")}

    });

    it("end,未开启拍卖,应操作失败",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      
      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      try{await auction.end();throw 1}catch(error){if(error==1)throw("预期异常,实际通过:")}
    });

    it("end,未到结束时间,应操作失败",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")


      let auctionStart = await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")
      let log = await auctionStart.wait(); 

      console.log("check start ----start")
      let {timestamp} = await ethers.provider.getBlock(log.blockNumber)  
      let auctionLength = await auction.auctionLength();
      let auctionInfoAfter = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoAfter.price))).to.equal(1); 
      console.log("price ok")
      expect(Number(auctionInfoAfter.auctionEnd)).to.equal(Number(auctionLength) + Number(timestamp)); 
      console.log("auctionEnd ok")
      expect(Number(utils.formatEther(auctionInfoAfter.livePrice))).to.equal(1.1); 
      console.log("livePrice ok")
      expect(auctionInfoAfter.winning).to.equal(await user.address);
      console.log("winning ok")
      console.log("check start ----end")

      let beforeethBalance = Number(utils.formatEther(await provider.getBalance(await user.address))); 

      let bid = await auction.bid({value : utils.parseUnits("1.3",18)});
      await epass(bid,"bid")
      
      await moveTime(60);
      await moveBlock(1);

      try{await auction.end();throw 1}catch(error){if(error==1)throw("预期异常,实际通过:")}
    });

    it("end,已end，应失败",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")


      let auctionStart = await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")
      let log = await auctionStart.wait(); 

      console.log("check start ----start")
      let {timestamp} = await ethers.provider.getBlock(log.blockNumber)  
      let auctionLength = await auction.auctionLength();
      let auctionInfoAfter = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoAfter.price))).to.equal(1); 
      console.log("price ok")
      expect(Number(auctionInfoAfter.auctionEnd)).to.equal(Number(auctionLength) + Number(timestamp)); 
      console.log("auctionEnd ok")
      expect(Number(utils.formatEther(auctionInfoAfter.livePrice))).to.equal(1.1); 
      console.log("livePrice ok")
      expect(auctionInfoAfter.winning).to.equal(await user.address);
      console.log("winning ok")
      console.log("check start ----end")

      let beforeethBalance = Number(utils.formatEther(await provider.getBalance(await user.address))); 

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      let end = await auction.end();
      await epass(end,"END");

      try{await auction.end();throw 1}catch(error){if(error==1)throw("预期异常,实际通过:")}

    });

    it("",async function(){
      const {router,vault,vetoken,auction,token,vote} = await loadFixture(deployTokenFixture);
      console.log("check init ----start")
      let auctionInfoBefore = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoBefore.price))).to.equal(1);
      console.log("price ok")
      expect(Number(auctionInfoBefore.auctionEnd)).to.equal(0);
      console.log("auctionEnd ok")
      expect(Number(auctionInfoBefore.livePrice)).to.equal(0);
      console.log("livePrice ok")
      expect(auctionInfoBefore.winning).to.equal("0x0000000000000000000000000000000000000000");
      console.log("winning ok")
      console.log("check init ----end")


      let auctionStart = await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")
      let log = await auctionStart.wait(); 

      console.log("check start ----start")
      let {timestamp} = await ethers.provider.getBlock(log.blockNumber)  
      let auctionLength = await auction.auctionLength();
      let auctionInfoAfter = await auction.auctions(0)
      expect(Number(utils.formatEther(auctionInfoAfter.price))).to.equal(1); 
      console.log("price ok")
      expect(Number(auctionInfoAfter.auctionEnd)).to.equal(Number(auctionLength) + Number(timestamp)); 
      console.log("auctionEnd ok")
      expect(Number(utils.formatEther(auctionInfoAfter.livePrice))).to.equal(1.1); 
      console.log("livePrice ok")
      expect(auctionInfoAfter.winning).to.equal(await user.address);
      console.log("winning ok")
      console.log("check start ----end")

      let beforeethBalance = Number(utils.formatEther(await provider.getBalance(await user.address))); 

      try{
        let auctionbid =  await auction.bid({value : utils.parseUnits("1.0",18)});
        await auctionbid.wait(1);
        throw "预期异常,实际通过：bid"
      }catch{
        console.log("预期异常,实际异常：bid");
      }
      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      let end = await auction.end();
      await epass(end,"END");
    });


});
