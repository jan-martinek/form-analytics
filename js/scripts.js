"use strict";

function FormAnalytics() {
	this.tabletop = null;
	
	this.form = null;
	this.id = null;
	
	this.dates = [];
	this.cases = [];
	this.questions = {};
	this.categories = {};

	this.init = function() {
		var requestParams = this.getQueryVariables();
		
		this.form = requestParams.form;
		
		if (requestParams['id']) {
			this.id = requestParams.id;	
		} else {
			var id = prompt('Zadejte identifikátor dotazníku');
			if (id) {
				window.location.href = window.location.href + '&id=' + id;	
			} else {
				alert('Bez zadání identifikátoru dotazníku jej není možné vyhodnotit.');
			}
		}
		
		for (var prop in requestParams) {
			if (/^c[0-9]+$/.test(prop)) {
				this.categories[parseInt(prop.substr(1))] = requestParams[prop];
			}
		}
		
		
		if (this.form && this.id) {
			this.tabletop = Tabletop.init({ 
				key: this.form, 
				simpleSheet: true,
				callback: this.prepData.bind(this)
			});
		}
	};
	
	
	this.prepData = function(data, tabletop) {
		for (var id in data) {
			var respondent = data[id];
			if (respondent['Zadejte identifikátor dotazníku'] != this.id) continue;
			
			this.cases.push(respondent);
			
			var date = respondent['Časová značka'].split('.');
			var dateObj = new Date(parseInt(date[2]), parseInt(date[1])-1, parseInt(date[0]));
			this.dates.push(dateObj.getTime());
			
			for (var question in respondent) {
				var answer = respondent[question];
				if (this.questions[question]) {
					this.questions[question].push(answer);	
				} else {
					this.questions[question] = [answer];
				}
			}
		}
		
		this.dates.sort();
		this.showResults();
	}
	
	this.showResults = function()
	{
		var output = '<table>';
		var qNumber = 1;
		
		var caseStruct = this.cases[0];
		for (var question in caseStruct) {
			if (question == 'Časová značka') continue;
			if (question == 'Zadejte identifikátor dotazníku') continue;
			
			
			var values = this.questions[question];
			
			var sum = values.reduce(function(a, b) { return parseInt(a) + parseInt(b); });
			var avg = sum / values.length;
			
			var sqDiffs = values.map(function(value){
				var diff = parseInt(value) - avg;
				return diff * diff;
			});
			var avgSqDiff = sqDiffs.reduce(function(a, b) { return a + b; }) / values.length;
			var stdDev = Math.sqrt(avgSqDiff);
			
			if (this.categories[qNumber]) {
				output += '<tr>';
				output += '<th colspan="4"><h2>' + this.categories[qNumber] + '</h2></th>';
				output += '</tr>';
				
				output += '<tr>';
				output += '<td colspan="2"></td>';
				output += '<th>průměr</th>';
				output += '<th>σ</th>';
				output += '</tr>';	
			}
			
			output += '<tr>';
			output += '<td>' + qNumber + '</td>';
			output += '<th title="' + values.join(',') + '">' + question + '</th>';
			output += '<td>' + avg.toFixed(2) + '</td>';
			output += '<td>' + stdDev.toFixed(3) + '</td>';
			output += '</tr>';
			
			qNumber++;
		}
		
		output += '</table>';
		
		var since = new Date(this.dates[0]);
		var until = new Date(this.dates[this.dates.length - 1]);
		output += '<p>Sebráno celkem ' + this.cases.length + ' odpovědí v období od ' + since.toLocaleDateString() + ' do ' + until.toLocaleDateString() + '.</p>';

		document.getElementById("content").innerHTML = output;
		spinner.stop();	
	}
	
	
	
	/*
		##     ## ######## ##       ########  ######## ########   ######
		##     ## ##       ##       ##     ## ##       ##     ## ##    ##
		##     ## ##       ##       ##     ## ##       ##     ## ##
		######### ######   ##       ########  ######   ########   ######
		##     ## ##       ##       ##        ##       ##   ##         ##
		##     ## ##       ##       ##        ##       ##    ##  ##    ##
		##     ## ######## ######## ##        ######## ##     ##  ######
	*/
	
	this.getQueryVariables = function() 
	{
		var qd = {};
		location.search.substr(1).split("&").forEach(
			function(item) {
				var s = item.split("="), k = s[0], v = s[1] && decodeURIComponent(s[1]); (qd[k] = qd[k] || []).push(v)
			}
		);
		return qd;
	}
};
