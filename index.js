var express = require('express');
var bodyParser = require('body-parser');
var mongojs = require('mongojs');
var path = require('path');
var logger = require('morgan');
var fs = require('fs');
var cookieParser = require('cookie-parser');



var app = express();
var port = 8080;


var dbUrl = 'mongodb://localhost:27017/itrix';
var db = mongojs(dbUrl);
var registrations = db.collection('registrations');
var payments = db.collection('payments');
var codher = db.collection('codher');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('static'));
app.use(logger('common', {stream: fs.createWriteStream('./access.log', {flags: 'a'})}));
app.use(logger('dev'));
app.set('views', './views');
app.set('view engine', 'pug');



app.get('/', function(req, res) {
	res.render('index');
});

app.post('/', function(req, res) {
	console.log(req.body);
	res.redirect('/student?mobile='+req.body.mobile);
});

app.get('/student', function(req, res) {
	var mobile = req.query.mobile;
	registrations.findOne({"mobile": mobile}, function(err, doc) {
		if(err)
		{
			console.log(err);
		}
		else
		{
			if(doc)
			{
				console.log(doc);
				payments.find({buyer_phone: mobile}, function(err, docs) {
					if(err)
					{
						console.log(err);
					}
					else
					{
						res.render('student', {stud: doc, workshops: docs});
					}
				});
			}
			else
			{
				res.redirect('/register?mobile='+mobile);
			}
		}
	});
});

app.get('/enroll', function(req, res) {
	var mobile = req.query.mobile;
	res.render('enroll', {mobile: mobile});
});

app.post('/enroll', function(req, res) {
	console.log(req.body);
	var mobile = req.body.mobile;
	var enrollFor = req.body.enrollFor;
	if(enrollFor == 'Events')
	{
		registrations.update({"mobile": mobile}, {$set: {"events": "1"}});
		res.send('true');
	}
	else
	{
		registrations.findOne({"mobile": mobile}, function(err, doc) {
			if(err)
			{
				console.log(err);
				res.send('false');
			}
			else
			{
				console.log(doc);
				var buyer_name = doc.fname + ' ' + doc.lname;
				var buyer_details = {"buyer_name": buyer_name, "buyer_phone": doc.mobile, "buyer": doc.email, "offer_title": enrollFor, "status": "Credit"};
				payments.findOne(buyer_details, function(err, doc) {
					if(err)
					{
						console.log(err);
					}
					else
					{
						if(doc)
						{
							console.log("On-Spot registration for " + enrollFor + " in favour of " + mobile + " successful.");
							res.send('true');
						}
						else
						{
							payments.insert(buyer_details, function(err) {
								if(err)
								{
									console.log(err);
									res.send('false');
								}
								else
								{
									console.log("On-Spot registration for " + enrollFor + " in favour of " + mobile + " successful.");
									res.send('true');
								}
							});
						}
					}
				});
			}
		});
	}
});

app.get('/register', function(req, res) {
	var mobile = req.query.mobile;
	res.render('registration', {mobile: mobile});
});

app.post('/register', function(req, res) {
	console.log(req.body);
	registrations.findOne({"mobile": req.body.mobile}, function(err, doc) {
		if(err)
		{
			console.log(err);
			errorlog.write(err+'\n');
		}
		else
		{
			if(!doc)
			{
				var formdata = req.body;
				registrations.insert(formdata, function(err) {
					if(err)
					{
						console.log(err);
						errorlog.write(err+'\n');
						res.send('Error occurred during registration');
					}
					else
					{
						console.log("New Student registration Successful");
						res.send("New Student registration Successful");
					}
				});
			}
			else
			{
				console.log("Mobile Number already exists!");
				res.send("Duplicate Registration Attempted!");
			}
		}
	});
});


require('./admin-routes')(app, db);

app.listen(port);
console.log('SERVER STARTED!\nLISTENING NOW AT http://localhost:' + port);