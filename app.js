const cookieParser=require('cookie-parser');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
var session = require('express-session');

const app = express();
app.use(cookieParser())

const port = 6789;

// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));

// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
//app.get('/', (req, res) => res.send('Hello World'));

// app.get('/', function(req, res) {
// 	res.render('index');
//   });


app.use(session({
	secret:'secret',
	resave:false,
	saveUninitialized:false,
	cookie:{
	maxAge:null
	}}));

app.get('/', (req, res) => {
	res.clearCookie('mesajEroare');
	let produse = null;
	if(req.cookies['produse'] != null){
		produse = req.cookies['produse']
	}
	if(req.cookies["utilizator"]){
		res.render('index', {utilizator: req.cookies["utilizator"],
							
							produse: produse})
	}
	else{
		res.render('index', {utilizator : undefined,
							
							produse : undefined})
	}
		
});


// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
	// în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări

	let utilizator = req.session.numeLogat
	res.render('chestionar', {intrebari: listaIntrebari, utilizator:utilizator});
});

const fs = require('fs'); //The fs module provides a lot of very useful functionality to access and interact with the file system.
var data = fs.readFileSync('intrebari.json');
listaIntrebari = JSON.parse(data);

app.post('/rezultat-chestionar', (req, res) => {
	console.log(req.body);
	fs.readFile('intrebari.json', (err, data) => {
		var nr = 0;
		var i = 0;
		for (i in req.body) {
			console.log(listaIntrebari[parseInt(i.substring(1))].corect);
			if (req.body[i] == listaIntrebari[parseInt(i.substring(1))].corect) {
				nr++;
			}
		}
		console.log('Corecte:' + nr);
		let utilizator = req.session.numeLogat;
		res.render('rezultat-chestionar', { raspunsuri: nr , utilizator: utilizator});
		//The res.render() function is used to render a view and sends the rendered HTML string to the client
	});
});

app.get('/autentificare', function(req, res) {
	// res.render('autentificare');
	res.render('autentificare', {mesajEroare: req.cookies.mesajEroare, utilizator: null
	});
});

app.use(function(req, res, next) {
	res.locals.numeLogat = req.session.numeLogat;
	res.locals.id=req.session.id;
	next();
});

  app.post('/verificare-autentificare', (req, res, next) => {
	fs.readFile('utilizatori.json',(err,data) => {
		
		if(err) throw err;
		console.log("VERIFICARE AUTENTIFICARE");
		console.log(req.body);
		
		var users=JSON.parse(data);
		var i=0;
		let ok=0;
		
		for(i in users.utilizatori) {
			if(req.body.username === users.utilizatori[i].user && req.body.password === users.utilizatori[i].parola)
			{
				ok=1;
				req.session.rol = users.utilizatori[i].rol;
			}
			console.log(ok);
		}
		if(ok ==0){
			
			console.log("Nume utilizator sau parolă incorecte!");
			
			res.cookie('mesajEroare','Nume utilizator sau parolă incorecte!!!',{maxAge:1*60000});
			res.clearCookie("utilizator");
			res.redirect('/autentificare');
			
		}
		else{
			console.log("Autentificare corecta!");

			req.session.numeLogat = req.body.username;
			
			req.session.cos_cumparaturi = []
			
			console.log(req.session.numeLogat);
		
			res.cookie('utilizator', req.body.username,{maxAge:2*60000});

			res.redirect("/");
		}
	});


});


app.get('/creare-bd', (req, res) => {
	var mysql = require('mysql');

	var con = mysql.createConnection({
		host: "localhost",
		user: "root",
		password: "****"
	});

	con.connect(function (err, result) {
		if (err){
			console.log(err);
			console.log("Eroare la conectarea serverului bazei de date\n");
			return;
		}
		console.log("Conexiune realizata cu succes!!!");
		con.query("CREATE DATABASE cumparaturi", function (err) {
			if (err){
				console.log("Eroare la crearea bazei de date");
			}
			else{
				console.log("Baza de date a fost creata cu succes!!");
			}
			return;
		});

		var sql = "CREATE TABLE cumparaturi.produse (id INT PRIMARY KEY, nume VARCHAR(255), autor VARCHAR(255))";

		con.query(sql, function (err, result) {
			if(err){
				if(err.code == 'ER_TABLE_EXISTS_ERROR'){
					console.log("Tabela deja exista!");
				}
				else{
					console.log("Eroare la crearea tabelei");
				}
			}
			else{
				console.log("Tabela a fost creata cu succes!!");
			}
		});
	});

	res.redirect('/');
});

app.get('/inserare-bd', (req, res) => {

	var mysql = require('mysql');

	var dbConnectionpool = mysql.createPool({
		host: "localhost",
		user: "root",
		password: "****",
		database: "cumparaturi"
	});


	let products = [
		[100,'Nobody Listens', 'Rowena Wakefield'],
		[101, 'Christmas in Prague', 'Joyce Hannam'],
		[102, 'Scrisoare catre tata', 'Franz Kafka'],
		[103, 'O istorie a evreilor', 'Paul Johnson'],
		[104, 'Super Tehnici de memorare', 'Andy Szekely'],
		[105, 'Emotiile', 'Osho'],
		[106, 'Ierusalim. Biografia unui oras', 'Simon Sebag Montefiore'],
		[107, 'JUnit in Action, Second Edition', 'Felipe Leme'],
		[108, '127 Hours', 'Aron Ralston'],
		[109, 'Cronicile din Narnia – Leul, Vrajitoarea si Dulapul', 'Clive Staples Lewis'],
		[110, 'Amintiri din copilarie', 'Ion Creanga'],
		[111, 'Sfaturile unui diavol batran catre unul mai tanar', 'Clive Staples Lewis']
	];

	dbConnectionpool.getConnection((err,dbConnection)=> {
		if (err) {
			console.log("Eroare la conectarea bazei de date");
			return;
		}

		console.log("Conectarea realizata cu succes! (pt inserare)");
		var sqlBase = 'INSERT INTO cumparaturi.produse (id, nume, autor) VALUES';
		products.forEach(produs => {

			let sql = sqlBase + '('
			sql +="'" + produs[0]+ "'" + ", "
			sql +="'" + produs[1]+ "'" + ", "
			sql +="'" + produs[2]+ "'" + ')';
		

			dbConnection.query(sql,(err, result)=> {
				if (err) {
					if(err.code == 'ERR_DUP_ENTRY'){
						console.log("Inregistrarea exista deja");
					}
					else{

						console.log("Eroare la inserare! Cod eroare: " + err.code);
					}
				}
				else{
					console.log("Inserare cu succes");
				}
				return;
		    });
		});
		dbConnection.release();
		return;
	});

	res.redirect('/');
});

app.get('/afisare-produse', (req, res) => {

	var mysql = require('mysql');

	var dbConnectionpool = mysql.createPool({
		host: "localhost",
		user: "root",
		password: "****",
		database: "cumparaturi"
	});

	dbConnectionpool.getConnection((err,dbConnection)=> {
		if (err) {
			console.log("Eroare la conectare!");
			return;
		}
		console.log("Conectarea realizata cu succes! (pt afisare produse)");
		var sql = "SELECT * FROM produse";
		dbConnection.query(sql, function(err, result){
			if(err){
				console.log("Eroare la extragere date");
			}
			else{
				console.log("Date extrase cu succes");
				res.cookie('produse', result);
				res.redirect('/');
			}
			return;
		});
		dbConnection.release();
	});
});


app.post('/adaugare-cos', (req, res) => {
	console.log("Incercam adaugarea produsului cu id [" + req.body.id + "] in cos!");
	if(req.session.cos_cumparaturi === undefined){
		req.session.cos_cumparaturi = [];
	}

	req.cookies['produse'].forEach(produs =>{
		if(produs.id == req.body.id){
			var status = false;
			req.session.cos_cumparaturi.forEach(sessionProduct =>{
				if(sessionProduct.id == produs.id){
					// console.log('Produsul exista deja!')
					req.session.cos_cumparaturi.push(produs);
					status = true;
				}
			});
		if(status == false){
			req.session.cos_cumparaturi.push(produs);
		}
	}

	});

	console.log(req.session.cos_cumparaturi);
	res.redirect('/');

});

app.get('/vizualizare-cos', (req, res) =>{
	let utilizator = req.session.numeLogat
	res.render('vizualizare-cos', {produse:req.session.cos_cumparaturi, utilizator: utilizator});
});

app.get('/admin', (req, res) => {
	console.log(req.session.rol)
	if(req.session && req.session.rol === 'admin')
	{
		res.render('admin', { utilizator: "admin"})
	}
	else{
		res.redirect('/')
	}
});


app.post('/adaugare-produs', (req, res) => {
	var mysql = require('mysql');

	var dbConnectionpool = mysql.createPool({
		host: "localhost",
		user: "root",
		password: "****",
		database: "cumparaturi"
	});

	dbConnectionpool.getConnection((err,dbConnection)=> {
		if (err) {
			console.log("Eroare la conectare!");
			return;
		}
		console.log("Conectarea realizata cu succes! (pt afisare adaugare produse de catre admin)");
		var sqlBase = 'INSERT INTO cumparaturi.produse (id, nume, autor) VALUES';
		

		let sql = sqlBase + '('
		sql +="'" + req.body.id+ "'" + ", "
		sql +="'" + req.body.nume+ "'" + ", "
		sql +="'" + req.body.autor  + "'" + ')';
		
		dbConnection.query(sql,(err, result)=> {
			if (err) {
				if(err.code == 'ERR_DUP_ENTRY'){
					console.log("Inregistrarea exista deja");
				}
				else{
					console.log("Eroare la inserare! Cod eroare: " +err.code);
				}
			}
			else{
				console.log("Inserare cu succes");
			}
			return;
		});
		
		dbConnection.release();
	});
})

app.get('/delogare', (request, response, next) => {
    response.clearCookie('utilizator');
	request.session.destroy();
    response.redirect('/');
});

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));
