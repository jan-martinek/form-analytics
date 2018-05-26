"use strict";

function SurveyData(slug) {
	this.slug = slug;
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

function ResultsViewer(org, categories, survey, zamSurvey) {
	this.categories = categories;
	this.org = org;
	this.manSurvey = survey;
	this.zamSurvey = zamSurvey;
	
	this.showResults = function()
	{
		document.getElementById('org').innerHTML = this.org;
		
		var output = '<table>';
		var descColHeaders = '<th valign="bottom">průměr</th>' + '<th valign="bottom">σ</th>';
		var qNumber = 1;
		
		var caseStruct = this.manSurvey.cases[0];
		for (var question in caseStruct) {
			if (question == 'Časová značka') continue;
			
			if (this.categories[qNumber]) {
				output += '<tr>';
				
				if (this.zamSurvey) {
					output += '<th colspan="2" rowspan="2"><h2>' + this.categories[qNumber] + '</h2></th>';
					output += '<th colspan="2" valign="bottom"><h2>' + this.manSurvey.name + '</h2</th>';
					output += '<th colspan="2" valign="bottom"><h2>' + this.zamSurvey.name + '</h2</th>';
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
			output += this.viewDescriptions(this.manSurvey.questions[question], survey.descriptives[question]);
			
			if (this.zamSurvey && this.zamSurvey.questions[question]) {
				output += this.viewDescriptions(this.zamSurvey.questions[question], zamSurvey.descriptives[question]);
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
		// arbitrary values used
		
		var min = 1;
		var max = 6;
		var avgHue = Math.round((descriptives.avg * 100/(max-min))-min);
		
		var maxStdDev = 3.54;
		var stdDevRedLightness = Math.round(descriptives.stdDev * 50/maxStdDev);
		
		var output = '<td title="' + values.join(',') + '" style="background: hsl('+avgHue+', 100%, 70%);">' + descriptives.avg.toFixed(2) + '</td>';
		output += '<td style="color: hsl(0, 70%, '+stdDevRedLightness+'%);">' + descriptives.stdDev.toFixed(3) + '</td>';
		return output;
	}
	
	this.generateDatasetDescription = function() {
		if (this.zamSurvey) {
			return '<p>V dotazníku <b>' + this.manSurvey.name + '</b> bylo sebráno celkem ' + this.manSurvey.cases.length + ' odpovědí v období od ' + this.manSurvey.firstEntryTime.toLocaleDateString() + ' do ' + this.manSurvey.lastEntryTime.toLocaleDateString() + '.<br> V dotazníku <b>' + this.zamSurvey.name + '</b> bylo sebráno celkem ' + this.zamSurvey.cases.length + ' odpovědí v období od ' + this.zamSurvey.firstEntryTime.toLocaleDateString() + ' do ' + this.zamSurvey.lastEntryTime.toLocaleDateString() + '.</p>';	
		} else {
			return '<p>Sebráno celkem ' + this.manSurvey.cases.length + ' odpovědí v období od ' + this.manSurvey.firstEntryTime.toLocaleDateString() + ' do ' + this.manSurvey.lastEntryTime.toLocaleDateString() + '.</p>';	
		}
	}
	

}

function FormAnalytics() {
	this.requestParams = null;
	this.categories = {};
	this.org = null;
	this.manSurvey = null;
	this.zamSurvey = null;

	this.init = function() {
		this.requestParams = this.getQueryVariables();
		for (const prop in this.requestParams) {
			this.requestParams[prop] = this.requestParams[prop][0];
		}

		this.org = this.requestParams.org;
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
		this.manSurvey = new SurveyData(this.requestParams.manId);
		this.manSurvey.init();
			
		this.zamSurvey = new SurveyData(this.requestParams.zamId);	
		this.zamSurvey.init();
			
		this.analyzeDataWhenReady();
	}
	
	this.fetchSurveyNames = function() {
		this.manSurvey.name = 'MGMT';
		this.zamSurvey.name = 'ZAM';
	}
	

	
	this.analyzeDataWhenReady = function() {
		var ready = this.zamSurvey ? this.manSurvey.dataPrepped && this.zamSurvey.dataPrepped : this.manSurvey.dataPrepped;
		
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
		this.manSurvey.calcSurveyTimespan();	
		this.zamSurvey.calcSurveyTimespan();	
		this.manSurvey.calcDescriptives();
		this.zamSurvey.calcDescriptives();
		
		var viewer = new ResultsViewer(this.org, this.categories, this.manSurvey, this.zamSurvey);
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
