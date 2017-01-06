"use strict";

function SurveyData(slug, id) {
	this.slug = slug;
	this.id = id;
	
	this.dates = [];
	this.cases = [];
	this.questions = {};
	
	this.dataPrepped = false;
	
	this.init = function() {
		console.log('Getting survey data.');
		
		Tabletop.init({ 
			key: this.slug, 
			simpleSheet: true,
			callback: this.prepData.bind(this)
		});
	}
	
	this.prepData = function(data, tabletop) {
		console.log('Processing survey data.');
		
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
		this.dataPrepped = true;
	}
	
}

function FormAnalytics() {
	this.requestParams = null;
	this.categories = {};
	this.survey = null;
	this.secondarySurvey = null;
	this.surveyName = null;
	this.secondarySurveyName = null;

	this.init = function() {
		this.requestParams = this.getQueryVariables();
		this.prepCategories();
		this.fetchSurveyNames();
		this.fetchSurveyData();
	};
	
	this.prepCategories = function() {
		for (var prop in this.requestParams) {
			if (/^c[0-9]+$/.test(prop)) {
				this.categories[parseInt(prop.substr(1))] = this.requestParams[prop];
			}
		}
	}
	
	this.fetchSurveyData = function() {
		if (this.requestParams['id']) {
			var surveyId = this.requestParams.id;	
		} else {
			var id = prompt('Zadejte identifikátor dotazníku');
			if (id) {
				window.location.href = window.location.href + '&id=' + id;	
			} else {
				alert('Bez zadání identifikátoru dotazníku jej není možné vyhodnotit.');
			}
		}
		
		if (this.requestParams.form && surveyId) {
			this.survey = new SurveyData(this.requestParams.form, surveyId);
			this.survey.init();
			
			if (this.requestParams.form2) {
				this.secondarySurvey = new SurveyData(this.requestParams.form2, surveyId);	
				this.secondarySurvey.init();
			}
			this.showResultsWhenReady();
		}
	}
	
	this.fetchSurveyNames = function() {
		this.surveyName = this.requestParams.name ? this.requestParams.name: 'A';
		this.secondarySurveyName = this.requestParams.name2 ? this.requestParams.name2: 'B';
	}
	
	this.showResultsWhenReady = function()
	{
		var ready = this.secondarySurvey ? this.survey.dataPrepped && this.secondarySurvey.dataPrepped : this.survey.dataPrepped;
		
		if (ready) {
			this.showResults();
		} else {
			console.log('Waiting for data.');
			var that = this;
			window.setTimeout(function(){
				that.showResultsWhenReady();
			}, 300);
		}
	}
	
	
	this.showResults = function()
	{
		var output = '<table>';
		var qNumber = 1;
		
		var caseStruct = this.survey.cases[0];
		for (var question in caseStruct) {
			if (question == 'Časová značka') continue;
			if (question == 'Zadejte identifikátor dotazníku') continue;			
			
			var values = this.survey.questions[question];
			var desc = this.calcDescriptives(values);
			
			if (this.secondarySurvey && this.secondarySurvey.questions[question]) {
				var values2 = this.secondarySurvey.questions[question];
				var desc2 = this.calcDescriptives(values2);	
			}
			
			if (this.categories[qNumber]) {
				output += '<tr>';
				if (this.secondarySurvey) {
					output += '<th colspan="2" rowspan="2"><h2>' + this.categories[qNumber] + '</h2></th>';
					output += '<th colspan="2" valign="bottom"><h2>' + this.surveyName + '</h2</th>';
					output += '<th colspan="2" valign="bottom"><h2>' + this.secondarySurveyName + '</h2</th>';
					output += '</tr>';	
					output += '<tr>';	
					output += '<th valign="bottom">průměr</th>';
					output += '<th valign="bottom">σ</th>';
					output += '<th valign="bottom">průměr</th>';
					output += '<th valign="bottom">σ</th>';
				} else {
					output += '<th colspan="2"><h2>' + this.categories[qNumber] + '</h2></th>';
					output += '<th valign="bottom">průměr</th>';
					output += '<th valign="bottom">σ</th>';
				}
				output += '</tr>';	
			}
			
			output += '<tr>';
			output += '<td>' + qNumber + '</td>';
			output += '<th title="' + values.join(',') + '">' + question + '</th>';
			output += '<td>' + desc.avg.toFixed(2) + '</td>';
			output += '<td>' + desc.stdDev.toFixed(3) + '</td>';
			
			if (this.secondarySurvey && this.secondarySurvey.questions[question]) {
				output += '<td>' + desc2.avg.toFixed(2) + '</td>';
				output += '<td>' + desc2.stdDev.toFixed(3) + '</td>';
			}
			
			output += '</tr>';
			qNumber++;
		}
		
		output += '</table>';
		output = this.generateDatasetDescription() + output;
		
		document.getElementById("content").innerHTML = output;
		spinner.stop();	
	}
	
	this.generateDatasetDescription = function() {
		var since = new Date(this.survey.dates[0]);
		var until = new Date(this.survey.dates[this.survey.dates.length - 1]);
		
		if (this.secondarySurvey) {
			var since2 = new Date(this.secondarySurvey.dates[0]);
			var until2 = new Date(this.secondarySurvey.dates[this.secondarySurvey.dates.length - 1]);
			return '<p>V dotazníku <b>' + this.surveyName + '</b> bylo sebráno celkem ' + this.survey.cases.length + ' odpovědí v období od ' + since.toLocaleDateString() + ' do ' + until.toLocaleDateString() + '.<br> V dotazníku <b>' + this.secondarySurveyName + '</b> bylo sebráno celkem ' + this.secondarySurvey.cases.length + ' odpovědí v období od ' + since2.toLocaleDateString() + ' do ' + until2.toLocaleDateString() + '.</p>';	
		} else {
			return '<p>Sebráno celkem ' + this.survey.cases.length + ' odpovědí v období od ' + since.toLocaleDateString() + ' do ' + until.toLocaleDateString() + '.</p>';	
		}
	}
	
	this.calcDescriptives = function(values) {
		var sum = values.reduce(function(a, b) { return parseInt(a) + parseInt(b); });
		var avg = sum / values.length;
		
		var sqDiffs = values.map(function(value){
			var diff = parseInt(value) - avg;
			return diff * diff;
		});
		var avgSqDiff = sqDiffs.reduce(function(a, b) { return a + b; }) / values.length;
		var stdDev = Math.sqrt(avgSqDiff);
		
		return {
			sum: sum,
			avg: avg,
			stdDev: stdDev	
		};
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
