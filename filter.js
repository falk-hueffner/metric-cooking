#! /usr/bin/node

const readline = require('node:readline');

const mc = require('./metric-cooking');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line)=> {
    const result =  mc.addMetricUnits(line);
    console.log(result);
})
