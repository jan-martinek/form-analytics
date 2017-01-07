"use strict";

function SurveyData(slug, id) {
	this.slug = slug;
	this.id = id;
	this.name = null;
	
	this.dates = [];
	this.cases = [];
	this.questions = {};
	this.descriptives = {};
	
	this.dataPrepped = false;
	
	this.firstEntryTime = null;
	this.lastEntryTime = null;
	
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
	
	this.calcDescriptives = function()
	{
		var caseStruct = this.cases[0];
		for (var question in caseStruct) {
			if (question == 'Časová značka') continue;
			if (question == 'Zadejte identifikátor dotazníku') continue;			
			
			this.descriptives[question] = this.calcQuestionDescriptives(this.questions[question]);			
		}
	}
	
	this.calcQuestionDescriptives = function(values) {
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
	
	this.calcSurveyTimespan = function() {
		this.firstEntryTime = new Date(this.dates[0]);
		this.lastEntryTime = new Date(this.dates[this.dates.length - 1]);
	}
	
}

function ResultsViewer(categories, survey, secondarySurvey) {
	this.categories = categories;
	this.survey = survey;
	this.secondarySurvey = secondarySurvey;
	
	this.showResults = function()
	{
		var output = '<table>';
		var descColHeaders = '<th valign="bottom">průměr</th>' + '<th valign="bottom">σ</th>';
		var qNumber = 1;
		
		var caseStruct = this.survey.cases[0];
		for (var question in caseStruct) {
			if (question == 'Časová značka') continue;
			if (question == 'Zadejte identifikátor dotazníku') continue;			
			
			if (this.categories[qNumber]) {
				output += '<tr>';
				
				if (this.secondarySurvey) {
					output += '<th colspan="2" rowspan="2"><h2>' + this.categories[qNumber] + '</h2></th>';
					output += '<th colspan="2" valign="bottom"><h2>' + this.survey.name + '</h2</th>';
					output += '<th colspan="2" valign="bottom"><h2>' + this.secondarySurvey.name + '</h2</th>';
					output += '</tr>';	
					output += '<tr>';	
					output += descColHeaders + descColHeaders;
				} else {
					output += '<th colspan="2"><h2>' + this.categories[qNumber] + '</h2></th>';
					output += descColHeaders;
				}
				output += '</tr>';	
			}
			
			output += '<tr>';
			output += '<td>' + qNumber + '</td>';
			output += '<th>' + question + '</th>';
			output += this.viewDescriptions(this.survey.questions[question], survey.descriptives[question]);
			
			if (this.secondarySurvey && this.secondarySurvey.questions[question]) {
				output += this.viewDescriptions(this.secondarySurvey.questions[question];, secondarySurvey.descriptives[question]);
			}
			
			output += '</tr>';
			qNumber++;
		}
		
		output += '</table>';
		output = this.generateDatasetDescription() + output;
		
		document.getElementById("content").innerHTML = output;
		spinner.stop();	
	}
	
	this.viewDescriptions = function(values, descriptives) {
		var output = '<td title="' + values.join(',') + '">' + descriptives.avg.toFixed(2) + '</td>';
		output += '<td>' + descriptives.stdDev.toFixed(3) + '</td>';
		return output;
	}
	
	this.generateDatasetDescription = function() {
		if (this.secondarySurvey) {
			return '<p>V dotazníku <b>' + this.survey.name + '</b> bylo sebráno celkem ' + this.survey.cases.length + ' odpovědí v období od ' + this.survey.firstEntryTime.toLocaleDateString() + ' do ' + this.survey.lastEntryTime.toLocaleDateString() + '.<br> V dotazníku <b>' + this.secondarySurvey.name + '</b> bylo sebráno celkem ' + this.secondarySurvey.cases.length + ' odpovědí v období od ' + this.secondarySurvey.firstEntryTime.toLocaleDateString() + ' do ' + this.secondarySurvey.lastEntryTime.toLocaleDateString() + '.</p>';	
		} else {
			return '<p>Sebráno celkem ' + this.survey.cases.length + ' odpovědí v období od ' + this.survey.firstEntryTime.toLocaleDateString() + ' do ' + this.survey.lastEntryTime.toLocaleDateString() + '.</p>';	
		}
	}
	

}

function FormAnalytics() {
	this.requestParams = null;
	this.categories = {};
	this.survey = null;
	this.secondarySurvey = null;

	this.init = function() {
		this.requestParams = this.getQueryVariables();
		this.prepCategories();
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
			this.analyzeDataWhenReady();
		}
	}
	
	this.fetchSurveyNames = function() {
		this.survey.name = this.requestParams.name ? this.requestParams.name: 'A';
		this.secondarySurvey.name = this.requestParams.name2 ? this.requestParams.name2: 'B';
	}
	

	
	this.analyzeDataWhenReady = function() {
		var ready = this.secondarySurvey ? this.survey.dataPrepped && this.secondarySurvey.dataPrepped : this.survey.dataPrepped;
		
		if (ready) {
			this.analyzeData();
		} else {
			console.log('Waiting for data.');
			var that = this;
			window.setTimeout(function(){
				that.analyzeDataWhenReady();
			}, 300);
		}
	}
	
	this.analyzeData = function() {
		this.fetchSurveyNames();
		this.survey.calcSurveyTimespan();	
		this.secondarySurvey.calcSurveyTimespan();	
		this.survey.calcDescriptives();
		this.secondarySurvey.calcDescriptives();
		
		var viewer = new ResultsViewer(this.categories, this.survey, this.secondarySurvey);
		viewer.showResults();
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
