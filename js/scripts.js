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
		
		console.log(this.categories);
		
		
		if (this.form && this.id) {
			this.tabletop = Tabletop.init({ 
				key: this.form, 
				simpleSheet: true,
				callback: this.prepData.bind(this)
			});
		}
		
		/*switch (doc) {
			case 'contacts':
				
			case 'timetable':
				this.tabletop = Tabletop.init({ 
					key: '1Bb4kXtTcbuyubmSnSXlsOg6qXG5etEzSxdj9ojV_9mM', 
					callback: this.showTimetable.bind(this)
				});
				break;
			case 'todos':
				this.tabletop = Tabletop.init({ 
					key: '1Bb4kXtTcbuyubmSnSXlsOg6qXG5etEzSxdj9ojV_9mM', 
					callback: this.showTodos.bind(this)
				});
				break;
			case 'files':
				var that = this;
				jQuery.get('/content/files.html', function(data) {
				    that.showFiles(data);
				});
				break;
			default:
				this.tabletop = Tabletop.init({
					key: '17JMfqYbXJswV2t9_NnxBBjjJ5ZXCqiFAoqDIRLsyn8k', 
					callback: this.showNews.bind(this),
					simpleSheet: true
				});
		}*/
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
		console.log(this.cases);
		console.log(this.questions);
		
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
		
		/*var addressTpl = '<p><strong>%Jméno%</strong><br>%Pozice%<br><a href="mailto:%E-mail%">%E-mail%</a><br>+420 %Telefon%</p>';
		
		output += this.showContactsSection(data.Koordinace.elements, 'Koordinace');
		output += this.showContactsSection(data.KA1.elements, 'KA1 Strategické plánování');
		output += this.showContactsSection(data.KA2.elements, 'KA2 Fundraising');*/

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
	
	this.nl2br = function(str) {
	  return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br>$2');
	}
	
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
