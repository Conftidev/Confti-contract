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

        
        ufactory = factoryContract.connect(user);
        
        const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
        ntoken = await  TestERC11555.deploy();
        console.log("ntoken:"+ntoken.address)
        ntoken = ntoken.connect(user);

        const mint1 = await ntoken.mintBatch(user_addr,60,gas);
        await mint1.wait(1);
        console.log("ntoken 1 success:" + await ntoken.address);

        ntoken2 = await  TestERC11555.deploy();
      
        await ntoken2.deployed();
        ntoken2 = ntoken2.connect(user);
       
        const mint12 = await ntoken2.mint(user_addr,1,10000,gas)
        await mint12.wait(1);
      
        const mint22 = await ntoken2.mint(user_addr,2,10000,gas)
        await mint22.wait(1);
        
        const mint32 = await ntoken2.mint(user_addr,3,10000,gas)
        await mint32.wait(1);
        console.log("ntoken 2 success:" + await ntoken2.address);


        const ERC721 = await hre.ethers.getContractFactory("contracts/test/ERC721.sol:TestERC721"); 
        ntoken3 = await  ERC721.deploy();
        ntoken3 = ntoken3.connect(user);

        const mint13 = await ntoken3.mint(user_addr,1,gas)
        await mint13.wait(1);
      
        const mint23 = await ntoken3.mint(user_addr,2,gas)
        await mint23.wait(1);
        
        const mint33 = await ntoken3.mint(user_addr,3,gas)
        await mint33.wait(1);
        console.log("ntoken 3 success:" + await ntoken3.address);
        

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


        
        let mybalance = await token.balanceOf(user.address)
        console.log("个人token余额: ",ethers.utils.formatEther(mybalance));

        
        return {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory};
    }

    it("redeem:正常流程",async function(){
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);
      await vault.redeem();
    });

    it("curatorDeposit: 单类NFT(1155)应成功", async ()=>{
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);

      router1 = await getRouter(ufactory,routerContract,user);
      const setApprovalForAll= await ntoken.setApprovalForAll(router1.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router1.curatorDeposit(
        [ntoken.address],
        [1],
        [5]
        ,gas);
      await deposit.wait(1); 

      let issue  = await router1.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
      await issue.wait(1); 

      await vault.redeem();


    });
    it("curatorDeposit: 多类NFT应成功", async ()=>{
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);

      router1 = await getRouter(ufactory,routerContract,user);
      const setApprovalForAll= await ntoken.setApprovalForAll(router1.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const deposit = await router1.curatorDeposit(
        [ntoken.address,ntoken.address,ntoken.address],
        [1,2,3],
        [10,10,10]
        ,gas);
      await deposit.wait(1); 

      let issue  = await router1.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
      await issue.wait(1); 

      await vault.redeem();


    });
    it("curatorDeposit: NFT种类等于50应成功", async ()=>{
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);

      router1 = await getRouter(ufactory,routerContract,user);
      const setApprovalForAll= await ntoken.setApprovalForAll(router1.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);

      const addrs = [];
      const ids = [];
      const amounts = [];
      for (let index = 0; index < 50; index++) {
        addrs[index] = ntoken.address;
        ids[index] = index;
        amounts[index] = 10;        
      }

      const deposit = await router1.curatorDeposit(
        addrs,ids,amounts
        ,gas);
      await deposit.wait(1); 

      let issue  = await router1.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
      await issue.wait(1); 

      await vault.redeem();

    });
    it("curatorDeposit: 多类合约应成功", async ()=>{
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);

      router1 = await getRouter(ufactory,routerContract,user);
      
      const setApprovalForAll= await ntoken.setApprovalForAll(router1.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);
      
      const setApprovalForAll2= await ntoken2.setApprovalForAll(router1.vault(),true,gas);
      console.log("【aprove 2】");
      await setApprovalForAll2.wait(1);

      const deposit = await router1.curatorDeposit(
        [ntoken.address,ntoken.address,ntoken2.address],
        [1,2,3],
        [10,10,10]
        ,gas);
      await deposit.wait(1); 

      let issue  = await router1.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
      await issue.wait(1); 

      await vault.redeem();

    });
    it("curatorDeposit: 721应成功", async ()=>{
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);

      router1 = await getRouter(ufactory,routerContract,user);
     
      const setApprovalForAll2= await ntoken3.setApprovalForAll(router1.vault(),true,gas);
      console.log("【aprove 2】");
      await setApprovalForAll2.wait(1);

      const deposit = await router1.curatorDeposit(
        [ntoken3.address,ntoken3.address],
        [1,2],
        [1,1]
        ,gas);
      await deposit.wait(1); 

      let issue  = await router1.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
      await issue.wait(1); 

      await vault.redeem();

    });
    it("curatorDeposit: 多标准（混合）应成功", async ()=>{
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);

      router1 = await getRouter(ufactory,routerContract,user);
      
      const setApprovalForAll= await ntoken.setApprovalForAll(router1.vault(),true,gas);
      console.log("【aprove】");
      await setApprovalForAll.wait(1);
      
      const setApprovalForAll2= await ntoken3.setApprovalForAll(router1.vault(),true,gas);
      console.log("【aprove 2】");
      await setApprovalForAll2.wait(1);

      const deposit = await router1.curatorDeposit(
        [ntoken.address,ntoken.address,ntoken3.address],
        [1,2,3],
        [10,10,1]
        ,gas);
      await deposit.wait(1); 

      let issue  = await router1.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
      await issue.wait(1); 

      await vault.redeem();

    });

    it("redeem:重复赎回应失败",async function(){
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);
      await vault.redeem();
      try{await vault.redeem();throw 1}catch(error){if(error==1)throw("预期异常,实际通过：redeem");console.log(error)}

    });

    it("redeem:用户未持有token ，应操作失败",async function(){
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);
      let user2 = await getUser(2);
      let vault2 = vault.connect(user2);
      
      try{await vault2.redeem();throw 1}catch(error){if(error==1)throw("预期异常,实际通过：redeem");console.log(error)}

    });

    it("redeem:用户持有token小于总量*99%,操作应失败",async function(){
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);
      let user2 = await getUser(2);
  
      const amount = ethers.utils.parseUnits("1");
      console.log("amount=",amount);

      let transfer = await token.transfer(user2.address,amount)
      await epass(transfer,"transfer")
      
      try{await vault.redeem();throw 1}catch(error){if(error==1)throw("预期异常,实际通过：redeem");console.log(error)}

    });

    it("redeem:已开启拍卖,操作应失败",async function(){
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);
      let user2 = await getUser(2);
      let a2 = auction.connect(user2);

      await a2.start({value : utils.parseUnits("1.1",18)})
      console.log("start")
  
      
      try{await vault.redeem();throw 1}catch(error){if(error==1)throw("预期异常,实际通过：redeem");console.log(error)}

    });

    
    it("redeem:拍卖结束，操作应失败",async function(){
      const {router,vault,vetoken,auction,token,vote,user,routerContract,ufactory} = await loadFixture(deployTokenFixture);

      await auction.start({value : utils.parseUnits("1.1",18)})
      console.log("start function")

      await moveTime(DELAY_WEEK);
      await moveBlock(1);

      await auction.end();
      console.log("END");
     
      try{await vault.redeem();throw 1}catch(error){if(error==1)throw("预期异常,实际通过：redeem");console.log(error)}
    });
});
