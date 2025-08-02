#! /usr/bin/node

var readline = require('node:readline');

var mc = require('./metric-cooking');

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', function(line){
    var result =  mc.addMetricUnits(line);
    console.log(result);
})
