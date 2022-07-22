//使用说明，在终端执行 npx hardhat test ./test/veToken-reward-test.js
//个人奖励单人测式角本
const { inputToConfig } = require("@ethereum-waffle/compiler");
const { expect, assert } = require("chai");
const { ethers,network,deployments} = require("hardhat");
const { provider } = waffle;

const DELAY_WEEK = 604800; // 1 week

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

async function blockInfo(){
    console.log("区块号：",await provider.getBlockNumber());
    console.log("区块时间：",(await provider.getBlock()).timestamp);
    return (await provider.getBlock()).timestamp;
}


describe("测式VeToken合约", async ()=> {
    let veToken;
    let token;
    let deployerAddress;

    before(async () => {
        const [deployer] = await ethers.getSigners();
        deployerAddress = deployer.address;

        //生成 token合约
        const te20 = await ethers.getContractFactory("TestErc20");
        token = await te20.deploy("5000000000000000000000000");
        console.log("tokenAddress = ",token.address);
       

        //生成 vetoken 合约
        const veTokenFactory = await ethers.getContractFactory("VeToken");
        veToken = await veTokenFactory.deploy();
        console.log("veTokenAddress = ",veToken.address);

        //初始化合约
        await veToken.initialize(token.address);
        console.log("已执行veToken.initializ");
    })

    afterEach(()=>{

    })
    
    it("->",async ()=>{
        const amount = 100000000000000000000; 
        
        //token授权给veToken
        // let approveTx = await token.approve(veToken.address,amount+"");
        // let approveResult =  await approveTx.wait();
        // console.log("授权成功！");

        //质押
        // let unLockedTime = Date.parse(new Date())/1000 + DELAY_WEEK * 4;
        // // console.log("质押锁定时间：",unLockedTime);
        // console.log("质押锁定时间对应周时间：",parseInt(unLockedTime/DELAY_WEEK) * DELAY_WEEK);
        // let tx = await veToken.createLock(amount+"",unLockedTime);
        // let tx2 = await tx.wait();
        // let datas = await veToken.userPointHistory(deployerAddress,1);
        // console.log("刚质押数据： ",datas);

        //查询当前用户可领取奖励数量
        // await blockInfo();
        // await veToken._checkpointTotalSupply();
        // console.log("个人当前奖励=",await veToken.claimableTokenTestByAll(deployerAddress));

        //移动1周后
        // await moveTime(DELAY_WEEK * 1);
        // await moveBlock(1);
        // await blockInfo();
        // await veToken._checkpointTotalSupply();
        // let tt1 = parseInt((parseInt(datas.ts) + DELAY_WEEK-1)/DELAY_WEEK) * DELAY_WEEK;
        // console.log("tt1 = ",tt1);
        // console.log(await veToken.veSupply(tt1));
        // console.log("移动一周后个人当前奖励=",await veToken.claimableTokenTestByAll(deployerAddress));

        // //移动2周后
        // await moveTime(DELAY_WEEK * 1);
        // await moveBlock(1);
        // await veToken._checkpointTotalSupply();
        // await blockInfo();
        // let tt2 = parseInt((parseInt(datas.ts) + DELAY_WEEK * 2-1)/DELAY_WEEK) * DELAY_WEEK;
        // console.log("tt2 = ",tt2);
        // console.log(await veToken.veSupply(tt2));
        // console.log("移动二周后个人当前奖励=",await veToken.claimableTokenTestByAll(deployerAddress));

        // //移动3周后
        // await moveTime(DELAY_WEEK * 1);
        // await moveBlock(1);
        // await veToken._checkpointTotalSupply();
        // await blockInfo();
        // let tt3 = parseInt((parseInt(datas.ts) + DELAY_WEEK*3-1)/DELAY_WEEK) * DELAY_WEEK;
        // console.log("tt3 = ",tt3);
        // console.log(await veToken.veSupply(tt3));
        // console.log("移动三周后个人当前奖励=",await veToken.claimableTokenTestByAll(deployerAddress));

        // //移动4周后
        // await moveTime(DELAY_WEEK * 1);
        // await moveBlock(1);
        // await veToken._checkpointTotalSupply();
        // await blockInfo();
        // let tt4 = parseInt((parseInt(datas.ts) + DELAY_WEEK*4-1)/DELAY_WEEK) * DELAY_WEEK;
        // console.log("tt4 = ",tt4);
        // console.log(await veToken.veSupply(tt4));
        // console.log("移动四周后个人当前奖励=",await veToken.claimableTokenTestByAll(deployerAddress));

        // //移动5周后
        // await moveTime(DELAY_WEEK * 1);
        // await moveBlock(1);
        // await veToken._checkpointTotalSupply();
        // await blockInfo();
        // let tt5 = parseInt((parseInt(datas.ts) + DELAY_WEEK*5-1)/DELAY_WEEK) * DELAY_WEEK;
        // console.log("tt5 = ",tt5);
        // console.log(await veToken.veSupply(tt5));
        // console.log("移动五周后个人当前奖励=",await veToken.claimableTokenTestByAll(deployerAddress));

    });

});
