const cheerio = require('cheerio');
const axios = require('axios');
const random = require('lodash/random');
const fs = require("fs");
const path = require('path');

const { targetATag, targetRegexp, targetText, targetURL } = require('./secret')
const cacheDir = './cache';

// 解析方法，可更换
const decode = (input) => {
  let rv = atob(input);
  rv = escape(rv);
  rv = decodeURIComponent(rv);
  return rv;
}

// 随机停一下
const sleep = () => {
  const ms = random(1000, 2000);
  console.log('随机休息', ms, '毫秒');
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 从 HTML 获取内容
const getItemsFromHtml = (html) => {
  // 生成 DOM
  const $ = cheerio.load(html);
  // 获取 a tag
  return $('html').find(targetATag)
    .toArray()
    .map(element => {
      const rawText = $(element).html(); // 获取 html
      const results = rawText.match(targetRegexp); // 匹配内容

      if (!results || results.length < 2) return rawText // 匹配不到内容

      return decode(results[1]); // 解析内容
    })
}

// 从 url 获取内容
const crawlUrl = async (page, url) => {
  const cacheFilePath = path.join(cacheDir, `${page}.html`);
  let data;
  if (fs.existsSync(cacheFilePath)) {
    // 缓存读取
    data = fs.readFileSync(cacheFilePath, 'utf8');
  } else {
    // 请求获取
    const response = await axios.get(url, { proxy: false });
    data = response.data
  }
  // 获取数据
  // 缓存 HTML 内容
  fs.writeFileSync(cacheFilePath, data);
  // 解析
  const total = getItemsFromHtml(data);
  // 搜索
  const results = total.filter(text => text.includes(targetText))
  // 上报
  console.log('当次内容条数', total.length, '搜索结果数', results.length, '关键词', targetText);
  return { total, results }
}

// 入口
const crawl = async () => {
  // 创建缓存文件夹
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir)
  }

  const results = [];

  for (let page = 1; page <= 200; page ++) {
    // await sleep()
    console.log('正在搜索 Page', page);
    const { total: curtTotal,  results: curtResult } = await crawlUrl(page, targetURL + page);
    if (curtTotal.length === 0) {
      // 中止
      break;
    }
    if (curtResult.length > 0) {
      // 加入结果
      results.push({
        page,
        result: curtResult
      });
    }
  }

  console.log('最终搜索结果', results);
}

crawl().then()
