const { inputToConfig } = require("@ethereum-waffle/compiler");
const { expect, assert, AssertionError } = require("chai");
const { ethers,network,deployments} = require("hardhat");
const { provider } = waffle;
const { utils} = require("ethers");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

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

async function getAddr(account){
    return await account.address
}

async function expectFail(action){
    console.log("预期错误:")
    let result = false
    try {
      await action.wait()
      result = true;
      console.log("expect fail , but passed");
    } catch (error) {
      console.log("expect fail , right");
    }finally{
      if(result) throw "expect erro";
    }
  }
async function getUser(index){
    const accounts = await hre.ethers.getSigners();
    const user = accounts[index];
    console.log(user.address);
    return user;
}
async function blockInfo(){
    console.log("区块号：",await provider.getBlockNumber());
    console.log("区块时间：",(await provider.getBlock()).timestamp);
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
  let issue  = await router.issue(utils.parseUnits("10000",18) ,"Tcoin",5000,utils.parseUnits("1",18),6048000,6048000,gas)
  await issue.wait(1); 
  return router;
}

async function getVault(router,user){
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.attach(router.vault());
  return vault.connect(user);
}
async function getVetoken(router,user){
  const VeToken = await hre.ethers.getContractFactory("VeToken");
  const vetoken = await VeToken.attach(router.veToken());
  return vetoken.connect(user);
}
async function getDivision(router,user){
  const Division = await hre.ethers.getContractFactory("Division");
  const division = await Division.attach(router.division());
  return division.connect(user);
}

describe("测式VeToken合约", async ()=> {

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
        const ufactory = factoryContract.connect(user);
        
        const TestERC11555 = await hre.ethers.getContractFactory("contracts/test/ERC1155.sol:TestERC1155"); 
        const ntokenx = await  TestERC11555.deploy();
      
        await ntokenx.deployed();
        ntoken = ntokenx.connect(user);

        const mint1 = await ntoken.mintBatch(user.address,10,gas);
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
        let mybalance = await token.balanceOf(user.address)
        console.log("个人token余额: ",ethers.utils.formatEther(mybalance));

        return {router,vault,vetoken,auction,token,vote,user,ntoken};

    }

    it("createLock: 修改拍卖价格状态应成功", async ()=>{
      
      const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
      const amount = ethers.utils.parseUnits("4000");
      console.log("amount=",amount);
      console.log("veToken.address=",vetoken.address);
      console.log("token.address=",token.address);

      let mybalance = await token.balanceOf(user.address)
      console.log("个人token余额：",ethers.utils.formatEther(mybalance));

      //token授权给veToken
      let approveTx = await token.approve(vetoken.address,amount.add(amount));
      let approveResult =  await approveTx.wait();
      console.log("授权成功！");

      let unLockedTime = await blockInfo() + DELAY_WEEK * 10;
      let tx2 = await vetoken.createLock(amount,unLockedTime);
      await tx2.wait(1);
      console.log("质押成功");

      const price = ethers.utils.parseUnits("10")
      let createVote  = await vote.createVote("xx","setVeTokenAmount","xx",5,price,gas);
      await createVote.wait(1);
      console.log("提案");

      const amount2 = ethers.utils.parseUnits("100");
      let increaseAmount = await vetoken.increaseAmount(amount2);
      await increaseAmount.wait(1);


    });
   
    // it("increaseAmount: 正常流程", async ()=>{
      
    //   const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
    //   const amount = ethers.utils.parseUnits("100");
    //   console.log("amount=",amount);
    //   console.log("veToken.address=",vetoken.address);
    //   console.log("token.address=",token.address);

    //   let mybalance = await token.balanceOf(user.address)
    //   console.log("个人token余额：",ethers.utils.formatEther(mybalance));

    //   //token授权给veToken
    //   let approveTx = await token.approve(vetoken.address,amount.add(amount));
    //   let approveResult =  await approveTx.wait();
    //   console.log("授权成功！");

    //   let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
    //   let tx2 = await vetoken.createLock(amount,unLockedTime);
    //   await tx2.wait(1);
    //   console.log("质押成功");

    //   let increaseAmount = await vetoken.increaseAmount(amount);
    //   await increaseAmount.wait(1);
    // });
    // it("increaseAmount: 授权金额小于质押金额,应操作失败", async ()=>{
      
    //   const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
    //   const amount = ethers.utils.parseUnits("100");
    //   console.log("amount=",amount);
    //   console.log("veToken.address=",vetoken.address);
    //   console.log("token.address=",token.address);

    //   let mybalance = await token.balanceOf(user.address)
    //   console.log("个人token余额：",ethers.utils.formatEther(mybalance));

    //   //token授权给veToken
    //   let approveTx = await token.approve(vetoken.address,amount);
    //   let approveResult =  await approveTx.wait();
    //   console.log("授权成功！");

    //   let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
    //   let tx2 = await vetoken.createLock(amount,unLockedTime);
    //   await tx2.wait(1);
    //   console.log("质押成功");

    //   try{await vetoken.increaseAmount(amount);throw 1}catch(error){if(error==1)throw("预期异常,实际通过：increaseAmount")}

    // });
    // it("increaseAmount: 质押金额大于可用余额,应操作失败", async ()=>{
      
    //   const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
    //   const amount = ethers.utils.parseUnits("4000");
    //   console.log("amount=",amount);
    //   console.log("veToken.address=",vetoken.address);
    //   console.log("token.address=",token.address);

    //   let mybalance = await token.balanceOf(user.address)
    //   console.log("个人token余额：",ethers.utils.formatEther(mybalance));

    //   //token授权给veToken
    //   let approveTx = await token.approve(vetoken.address,amount.add(amount));
    //   let approveResult =  await approveTx.wait();
    //   console.log("授权成功！");

    //   let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
    //   let tx2 = await vetoken.createLock(amount,unLockedTime);
    //   await tx2.wait(1);
    //   console.log("质押成功");

    //   try{await vetoken.increaseAmount(amount);throw 1}catch(error){if(error==1)throw("预期异常,实际通过：increaseAmount")}

    // });
    // it("increaseAmount: 未创建质押,应操作失败", async ()=>{
      
    //   const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
    //   const amount = ethers.utils.parseUnits("100");
    //   console.log("amount=",amount);
    //   console.log("veToken.address=",vetoken.address);
    //   console.log("token.address=",token.address);

    //   let mybalance = await token.balanceOf(user.address)
    //   console.log("个人token余额：",ethers.utils.formatEther(mybalance));

    //   //token授权给veToken
    //   let approveTx = await token.approve(vetoken.address,amount.add(amount));
    //   let approveResult =  await approveTx.wait();
    //   console.log("授权成功！");

    //   try{await vetoken.increaseAmount(amount);throw 1}catch(error){if(error==1)throw("预期异常,实际通过：increaseAmount")}

    // });
    // it("increaseAmount: 质押已到期,应操作失败", async ()=>{
      
    //   const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
    //   const amount = ethers.utils.parseUnits("100");
    //   console.log("amount=",amount);
    //   console.log("veToken.address=",vetoken.address);
    //   console.log("token.address=",token.address);

    //   let mybalance = await token.balanceOf(user.address)
    //   console.log("个人token余额：",ethers.utils.formatEther(mybalance));

    //   //token授权给veToken
    //   let approveTx = await token.approve(vetoken.address,amount.add(amount));
    //   let approveResult =  await approveTx.wait();
    //   console.log("授权成功！");

    //   let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
    //   let tx2 = await vetoken.createLock(amount,unLockedTime);
    //   await tx2.wait(1);
    //   console.log("质押成功");

    //   moveTime(DELAY_WEEK * 5);
    //   await moveBlock(1);
    //   //查询5周后个人当前VE权益
    //   blockInfo();
    //   let veOfAfter5Week = await vetoken.userOfEquity(user.address);
    //   console.log("五周后VE权益=",veOfAfter5Week.toString());

    //   try{await vetoken.increaseAmount(amount);throw 1}catch(error){if(error==1)throw("预期异常,实际通过：increaseAmount")}

    // });
    // it("increaseAmount: 追加质押额度=0 应失败", async ()=>{
      
    //   const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
    //   const amount = ethers.utils.parseUnits("100");
    //   console.log("amount=",amount);
    //   console.log("veToken.address=",vetoken.address);
    //   console.log("token.address=",token.address);

    //   let mybalance = await token.balanceOf(user.address)
    //   console.log("个人token余额：",ethers.utils.formatEther(mybalance));

    //   //token授权给veToken
    //   let approveTx = await token.approve(vetoken.address,amount.add(amount));
    //   let approveResult =  await approveTx.wait();
    //   console.log("授权成功！");

    //   let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
    //   let tx2 = await vetoken.createLock(amount,unLockedTime);
    //   await tx2.wait(1);
    //   console.log("质押成功");

    //   try{await vetoken.increaseAmount(ethers.utils.parseUnits("0"));throw 1}catch(error){if(error==1)throw("预期异常,实际通过：increaseAmount")}

    // });
    // it("increaseAmount: 追加质押额度负数，应失败", async ()=>{
      
    //   const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
    //   const amount = ethers.utils.parseUnits("100");
    //   console.log("amount=",amount);
    //   console.log("veToken.address=",vetoken.address);
    //   console.log("token.address=",token.address);

    //   let mybalance = await token.balanceOf(user.address)
    //   console.log("个人token余额：",ethers.utils.formatEther(mybalance));

    //   //token授权给veToken
    //   let approveTx = await token.approve(vetoken.address,amount.add(amount));
    //   let approveResult =  await approveTx.wait();
    //   console.log("授权成功！");

    //   let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
    //   let tx2 = await vetoken.createLock(amount,unLockedTime);
    //   await tx2.wait(1);
    //   console.log("质押成功");

    //   try{await vetoken.increaseAmount(ethers.utils.parseUnits("-1"));throw 1}catch(error){if(error==1)throw("预期异常,实际通过：increaseAmount")}

    // });




    // it("increaseUnlockTime: 正常流程", async ()=>{
      
    //   const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);
      
      
    //   const amount = ethers.utils.parseUnits("100",18);
    //   console.log("amount=",amount);
    //   console.log("veToken.address=",vetoken.address);
    //   console.log("token.address=",token.address);

    //   let mybalance = await token.balanceOf(user.address)
    //   console.log("个人token余额：",ethers.utils.formatEther(mybalance));

    //   //token授权给veToken
    //   let approveTx = await token.approve(vetoken.address,amount.add(amount));
    //   let approveResult =  await approveTx.wait();
    //   console.log("授权成功！");

    //   let unLockedTime = await blockInfo() + DELAY_WEEK * 1;
    //   let tx2 = await vetoken.createLock(amount,unLockedTime);
    //   await tx2.wait(1);
    //   console.log("质押成功");

      
    //   let increaseUnlockTime = await vetoken.increaseUnlockTime(unLockedTime + DELAY_WEEK*3);
    //   await increaseUnlockTime.wait(1);

      
    //   moveTime(DELAY_WEEK * 3);
    //   await moveBlock(1);
    //   //查询1周后个人当前VE权益
    //   blockInfo();
    //   let veOfAfter5Week = await vetoken.userOfEquity(user.address);
    //   console.log("3周后VE权益=",veOfAfter5Week.toString());

    //   let claim = await vetoken.claim();
    //   await claim.wait(1);
    //   mybalance = await token.balanceOf(user.address)
    //   console.log("个人token余额：",ethers.utils.formatEther(mybalance));

    //   moveTime(DELAY_WEEK * 1);
    //   await moveBlock(1);
    //   //查询1周后个人当前VE权益
    //   blockInfo();
    //   veOfAfter5Week = await vetoken.userOfEquity(user.address);
    //   console.log("3周后VE权益=",veOfAfter5Week.toString());


    //   let withdraw = await vetoken.withdraw();
    //   await withdraw.wait(1);
    //   mybalance = await token.balanceOf(user.address)
    //   console.log("个人token余额：",ethers.utils.formatEther(mybalance));
      
    //   claim = await vetoken.claim();
    //   await claim.wait(1);
    //   mybalance = await token.balanceOf(user.address)
    //   console.log("个人token余额：",ethers.utils.formatEther(mybalance));

      
    // });

    

    // it("createLock: 操作成功", async ()=>{
      
    //   const {router,vault,vetoken,auction,token,vote,user,ntoken} = await loadFixture(deployTokenFixture);

    //   const amount = ethers.utils.parseUnits("100");
    //   console.log("amount=",amount);

    //   console.log("veToken.address=",vetoken.address);
    //   console.log("token.address=",token.address);

    //   let mybalance = await token.balanceOf(user.address)
    //   console.log("个人token余额：",ethers.utils.formatEther(mybalance))

    //   //token授权给veToken
    //   let approveTx = await token.approve(vetoken.address,amount+"");
    //   let approveResult =  await approveTx.wait();
    //   console.log("授权成功！");
  

    //   //质押
    //   let TotalR = await vetoken.totalReward();
    //   console.log("TotalR = ",TotalR)
    //   let unLockedTime = await blockInfo() + DELAY_WEEK * 5;
    //   console.log("质押锁定时间：",unLockedTime);
    //   console.log("质押锁定时间对应周时间：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
    //   let tx = await vetoken.createLock(amount+"",unLockedTime);
    //   let tx2 = await tx.wait();

    //   console.log("刚质押数据： ",await vetoken.userPointHistory(user.address,1));

    //   //查询个人当前VE权益
    //   let lastBlkTime = blockInfo();
    //   let ve = await vetoken.userOfEquity(user.address);
    //   console.log("bias = " +(await vetoken.userPointHistory(user.address,1)).bias);
    //   console.log("VE权益=",ve.toString());

    //   //移动1周后
    //   moveTime(DELAY_WEEK * 1);
    //   await moveBlock(1);
    //   //查询1周后个人当前VE权益
    //   blockInfo();
    //   let veOfAfterWeek = await vetoken.userOfEquity(user.address);
    //   console.log("一周后VE权益=",veOfAfterWeek.toString());

    //   //移动2周后
    //   moveTime(DELAY_WEEK * 1);
    //   await moveBlock(1);
    //   //查询2周后个人当前VE权益
    //   blockInfo();
    //   let veOfAfter2Week = await vetoken.userOfEquity(user.address);
    //   console.log("二周后VE权益=",veOfAfter2Week.toString());

    //   //移动3周后
    //   moveTime(DELAY_WEEK * 1);
    //   await moveBlock(1);
    //   //查询3周后个人当前VE权益
    //   blockInfo();
    //   let veOfAfter3Week = await vetoken.userOfEquity(user.address);
    //   console.log("三周后VE权益=",veOfAfter3Week.toString());

    //   //移动3周后
    //   moveTime(DELAY_WEEK * 1);
    //   await moveBlock(1);
    //   //查询3周后个人当前VE权益
    //   blockInfo();
    //   let veOfAfter4Week = await vetoken.userOfEquity(user.address);
    //   console.log("四周后VE权益=",veOfAfter4Week.toString());

    //   //移动3周后
    //   moveTime(DELAY_WEEK * 1);
    //   await moveBlock(1);
    //   //查询3周后个人当前VE权益
    //   blockInfo();
    //   let veOfAfter5Week = await vetoken.userOfEquity(user.address);
    //   console.log("五周后VE权益=",veOfAfter5Week.toString());

    // });
});
