
/**
 * provide data for manager report and user report
 */
var express = require('express');
var db = require('./databaseController');
// var db = require('../test/mock/mockController');
var config = require('../config');
var mngrReportLinkHead = config.teambot_url + "/manager-report";
var userReportLinkHead = config.teambot_url + "/user-report";

/**
 * generate report links for both mngr and user
 * @return {mattermost_username: link}
 * @return eg: {'mngr1': 'host+/manager-report/mngr1/2019-10-28'}
 */
async function generateReportLinks(org_id) {
    var today = formatDate(new Date());
    var mngrs = await db.listMngrGithubNameByOrgId(org_id);
    var users = await db.listUserGithubNameByOrgId(org_id);
    var links = {};
    for (var mngr of mngrs) {
        var mName = await db.getMattermostNameByGithubName(mngr);
        links[mName] = mngrReportLinkHead + '/' + mngr + '/' + today;
    }
    for (var user of users) {
        var mName = await db.getMattermostNameByGithubName(user);
        links[mName] = userReportLinkHead + '/' + user + '/' + today;
    }

    return links;
}

function sortOnKeys(dict, key_name, value_name) {
    // console.log("dict" , dict);

    sorted_array = [[key_name, value_name]];
    var sorted = [];
    for(var key in dict) {
        // console.log("key type: ", typeof key);

        sorted[sorted.length] = key;
    }
    sorted.sort(function (a, b) {
        return new Date(a) - new Date(b);
    });
    // console.log("sorted: ", sorted);

    for (var key of sorted){

        if ( (typeof dict[key] !== 'undefined')){
            sorted_array.push([key, dict[key]])
        }

        else{
            if (! dict[key]){
                sorted_array.push([key, 0])
            }
            sorted_array.push([key, 0])
        }
    }
    // console.log("sorted_array: ",sorted_array);
    return sorted_array
}

/**
 * helper function to calculate start and end date of week of {date}
 * @param date set default to today
 * @returns {[any | Date, any | Date]}
 */
function weekDate(date = new Date()) {
    var year = date.getFullYear();
    var month = date.getMonth();
    var nowDate = date.getDate();
    var day = date.getDay();
    var beginDate = new Date(year, month, nowDate - day);
    var endDate = new Date(year, month, nowDate + 6 - day);
    beginDate = formatDate(beginDate);
    endDate = formatDate(endDate);
    return [beginDate, endDate];
}

function getNWeeksBeforeDate(n, date = new Date()) {
    var year = date.getFullYear();
    var month = date.getMonth();
    var nowDate = date.getDate();
    var lastNWeek = new Date(year, month, nowDate - (n * 7));
    return lastNWeek;
}

function formatDate(date) {
    var myyear = date.getFullYear();
    var mymonth = date.getMonth() + 1;
    var myweekday = date.getDate();

    if (mymonth < 10) {
        mymonth = "0" + mymonth;
    }
    if (myweekday < 10) {
        myweekday = "0" + myweekday;
    }
    return (myyear + "-" + mymonth + "-" + myweekday);
}

async function mngrReportDate(mngrName, date = new Date()) {
    var standardDate = getNWeeksBeforeDate(0);
    var outline = [];
    var weekCommits = {};
    var weekLineDelta = {};
    var weekPulls = {};
    var lastMonthCommits = 0;
    var lastMonthLineDelta = 0;
    var lastMonthPulls = 0;
    var monthCommitsDelta = 0;
    var monthLineDelta = 0;
    var monthPullsDelta = 0;
    var weekCommitsByRepo = {};
    var weekLinesByRepo = {};
    var weekPullsByRepo = {};
    var weekUserCommits = {};
    var weekUserLines = {};
    var weekUserPulls = {};

    // var lessThan5 = 1;
    // var idleMember = 1;
    // var biggerWeek =  'Thu Nov 07 2019 00:00:00 GMT-0500 (Eastern Standard Time)';

    var users = await db.listGithubNameInSameOrg(mngrName);
    var lessThan3CommitUsers = "";
    for (var userName of users) {
        //
        // if ( (typeof weekUserCommits[userName] == 'undefined')){
        //     lessThan3CommitUsers+= userName +",  ";
        //
        // }


        date = new Date(standardDate);
        var userData = await userReportData(userName, date);
        if (userData['weekCommits'][date] === 0) {
            outline.push(userName);
        }
        for (var i = 0; i < 8; i++) {
            var queryDate = getNWeeksBeforeDate(i, date);
            if (!weekCommits.hasOwnProperty(queryDate)) {
                weekCommits[queryDate] = 0;
                weekLineDelta[queryDate] = 0;
                weekPulls[queryDate] = 0;
            }
            weekCommits[queryDate] += userData['weekCommits'][queryDate];
            weekLineDelta[queryDate] += userData['weekLineDelta'][queryDate];
            weekPulls[queryDate] += userData['weekPulls'][queryDate];
            if (i < 4) {
                if (i === 0) {
                    weekUserCommits[userName] = userData['weekCommits'][queryDate];
                    weekUserLines[userName] = userData['weekLineDelta'][queryDate];
                    weekUserPulls[userName] = userData['weekPulls'][queryDate];
                }
                lastMonthCommits += userData['weekCommits'][queryDate];
                lastMonthLineDelta += userData['weekLineDelta'][queryDate];
                lastMonthPulls += userData['weekPulls'][queryDate];

                monthCommitsDelta += userData['weekCommits'][queryDate];
                monthLineDelta += userData['weekLineDelta'][queryDate];
                monthPullsDelta += userData['weekPulls'][queryDate];
            } else {
                monthCommitsDelta -= userData['weekCommits'][queryDate];
                monthLineDelta -= userData['weekLineDelta'][queryDate];
                monthPullsDelta -= userData['weekPulls'][queryDate];
            }
        }

        for (var repo in userData['commitsByRepo']) {
            if (weekCommitsByRepo.hasOwnProperty(repo)) {
                weekCommitsByRepo[repo] += userData['commitsByRepo'][repo];
            } else {
                weekCommitsByRepo[repo] = userData['commitsByRepo'][repo];
            }
        }
        for (var repo in userData['linesByRepo']) {
            if (weekLinesByRepo.hasOwnProperty(repo)) {
                weekLinesByRepo[repo] += userData['linesByRepo'][repo];
            } else {
                weekLinesByRepo[repo] = userData['linesByRepo'][repo];
            }
        }
        for (var repo in userData['pullsByRepo']) {
            if (weekPullsByRepo.hasOwnProperty(repo)) {
                weekPullsByRepo[repo] += userData['pullsByRepo'][repo];
            } else {
                weekPullsByRepo[repo] = userData['pullsByRepo'][repo];
            }
        }
    }
    for (var userName of users) {

        if ((typeof weekUserCommits[userName] === 'undefined')) {
            lessThan3CommitUsers += userName + ",  ";

        }
        else if ( weekUserCommits[userName] < 1){
            lessThan3CommitUsers += userName + ",  ";
        }
    }
    sortedWeekCommits = sortOnKeys(weekCommits, "Week", "Commits");
    return {
        'outline': outline,
        'weekCommits': sortOnKeys(weekCommits, "Week", "Commits"),
        'weekLineDelta': sortOnKeys(weekLineDelta, "Week", "LineDelta"),
        'weekPulls': sortOnKeys(weekPulls, "Week", "Pulls"),
        'lastMonthCommits': lastMonthCommits,
        'lastMonthLineDelta': lastMonthLineDelta,
        'lastMonthPulls': lastMonthPulls,
        'monthCommitsDelta': monthCommitsDelta,
        'monthLineDelta': monthLineDelta,
        'monthPullsDelta': monthPullsDelta,
        'weekCommitsByRepo': sortOnKeys(weekCommitsByRepo, "Repo", "weekCommits"),

        'weekLinesByRepo': sortOnKeys(weekLinesByRepo, "Repo", "weekLines"),
        'weekPullsByRepo': sortOnKeys(weekPullsByRepo, "Repo", "weekPulls"),
        'weekUserCommits': sortOnKeys(weekUserCommits, "User", "weekCommits"),
        'weekUserLines': sortOnKeys(weekUserLines, "User", "weekLines"),
        'weekUserPulls': sortOnKeys(weekUserPulls, "User", "weekPulls"),

        'lessThan3CommitUsers': lessThan3CommitUsers,
        'totalCommits': sortedWeekCommits[sortedWeekCommits.length-1][1]
    }
}

async function userReportData(userName, date = new Date()) {

    var outline = await outlineByUser(userName, date);
    var weekCommits = {};
    var weekLineDelta = {};
    var weekPulls = {};
    var lastMonthCommits = 0;
    var lastMonthLineDelta = 0;
    var lastMonthPulls = 0;
    var monthCommitsDelta = 0;
    var monthLineDelta = 0;
    var monthPullsDelta = 0;
    var commitsByRepo = {};
    var linesByRepo = {};
    var pullsByRepo = {};

    for (var j = 0; j < 8; j++) {
        var queryDate = getNWeeksBeforeDate(j, date);

        var data = await db.getStatisticsByUserAndDate(userName, queryDate);

        weekCommits[queryDate] = 0;
        weekLineDelta[queryDate] = 0;
        weekPulls[queryDate] = 0;
        if (!data) {
            continue;
        }
        for (var i = 0; i < data.length; i++) {
            weekCommits[queryDate] += data[i]['commits_number'];
            weekLineDelta[queryDate] += data[i]['codelines_change'];
            weekPulls[queryDate] += data[i]['pullrequest_number'];

            if (j < 4) {
                if (j === 0) {
                    commitsByRepo[data[i]['repo_name']] = data[i]['commits_number'];
                    linesByRepo[data[i]['repo_name']] = data[i]['codelines_change'];
                    pullsByRepo[data[i]['repo_name']] = data[i]['pullrequest_number'];
                }
                lastMonthCommits += data[i]['commits_number'];
                lastMonthLineDelta += data[i]['codelines_change'];
                lastMonthPulls += data[i]['pullrequest_number'];

                monthCommitsDelta += data[i]['commits_number'];
                monthLineDelta += data[i]['codelines_change'];
                monthPullsDelta += data[i]['pullrequest_number'];
            } else {
                monthCommitsDelta -= data[i]['commits_number'];
                monthLineDelta -= data[i]['codelines_change'];
                monthPullsDelta -= data[i]['pullrequest_number'];
            }
        }


    }

    return {
        'outline': 100*outline,
        'weekCommits': weekCommits,
        'weekLineDelta': weekLineDelta,
        'weekPulls': weekPulls,
        'lastMonthCommits': lastMonthCommits,
        'lastMonthLineDelta': lastMonthLineDelta,
        'lastMonthPulls': lastMonthPulls,
        'monthCommitsDelta': monthCommitsDelta,
        'monthLineDelta': monthLineDelta,
        'monthPullsDelta': monthPullsDelta,
        // 'commitsByRepo': commitsByRepo,
        // 'linesByRepo':  linesByRepo,
        // 'pullsByRepo':  pullsByRepo
        'commitsByRepo': commitsByRepo,
        'linesByRepo':  linesByRepo,
        'pullsByRepo':  pullsByRepo
    }
}


async function f() {
    var test = await mngrReportDate('cyuan7');
    // var test = await userReportData('cyuan7');

    console.log(test);
}

// f();

/**
 * help functions for generate user's report
 */
// @return higher than ??% coworkers
async function outlineByUser(userName, date) {
    var orgId = await db.getOrgIdByMName(userName);
    var orgUserNum = await db.countOrgUserNum(orgId);

    var userNumLessThan = await db.countLessCommitUser(userName, orgId, date);

    return userNumLessThan / orgUserNum;
}

// End of helper functions

exports.generateReportLinks = generateReportLinks;
exports.userReportData = userReportData;
exports.mngrReportDate = mngrReportDate;
exports.getNWeeksBeforeDate = getNWeeksBeforeDate;
exports.sortOnKeys = sortOnKeys;
