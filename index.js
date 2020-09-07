var express = require('express');
var mysql = require('mysql2');
var fs = require('fs');
var session = require('express-session');
var bodyParser = require('body-parser');
var uploadGambar = require('express-fileupload')
var app = express();

app.set('views', './views');
app.set('view engine', 'pug');

app.use(express.static('public'));

var auth = 'auth';
var index = 'index';
var produkPug = 'produk';
var userPug = 'user';

function getMySQLConnection() {
    return mysql.createConnection({
        host : 'localhost',
        user : 'root',
        password : '',
        database : 'tugas5'
    });
};
var connection = getMySQLConnection();
    connection.connect();

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.render(auth);
});
app.use(uploadGambar());

app.post('/', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    if (username && password) {
    connection.query('SELECT * FROM users WHERE username = ? AND password = md5(?)', [username, password], function(error, result, fields) {
      if (result.length > 0) {
          req.session.loggedin = true;
          var username = result[0].username;
          req.session.username = username;
          res.redirect('/index');
          res.end();
      } else {
        res.render(auth,{'msg' : 'Incorrect Username and/or Password!'})
      }
      res.end()
    })
    } else {
      res.render(auth,{'msg' : 'Please enter Username and Password!'})
      res.end()
    }
})

app.post('/register', (req, res) => {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    if (username && password) {
        connection.query('SELECT * FROM users WHERE username = ?', username, function(error, result, fields) {
          if (result.length > 0) {
            res.render('reg',{'msg' : `This username : ${username}, is has been used !`})
            res.end()
          } else {
                var sqlinsert = `INSERT INTO users VALUES( null , ? , md5(?) , ? , 1)`;
                var params = [username,password,email];

                connection.query(sqlinsert, params, (error, result) => {
                      if (error) {
                            throw error;
                        }
                        res.redirect('/')
                })
          }
        })
    }
})

app.get('/index', function (req, res) {

    if (req.session.loggedin) {
        connection.query('SELECT * FROM users WHERE role_id = 1', function (error, rows, fields) {
          if (error) {
            throw error
          }
          connection.query(`SELECT COUNT(*) AS usr FROM users`, (error, result, fields) => {
            if(error)
            {
                throw error;
            }
            connection.query(`SELECT COUNT(*) AS brg FROM produk`, (error2, result2, fields2) => {
                if(error2)
                {
                    throw error2;
                }
                connection.query(`SELECT * FROM produk LIMIT 3`, (error3, result3, fields3) => {
                    var produk2 = [];
                    var warna = ['success', 'warning', 'danger'];
                    for (let index = 0; index < result3.length; index++) {
                        var data = {
                            'nama_produk' : result3[index].nama_produk,
                            'stok_produk' : result3[index].stok_produk,
                            'id' : result3[index].id,
                            'warna' : warna[index]
                        };
            
                        produk2.push(data);   
                    }
                console.log(produk2);

                var userTotal = result[0].usr;
                var produkTotal = result2[0].brg;
                var nama = req.session.username;
                // console.log(userTotal);
                // console.log(produkTotal);
                res.render(index, {'usersTotal' : userTotal, 'produksTotal': produkTotal,'usersname' : nama, 'prods' : produk2});
                });
            })
        });
    });
  	} else {
  		  res.redirect('/')
  	}
});

app.get('/users', function (req, res) {
    
    var user = [];
    // connect ke db
    var connection = getMySQLConnection();
    connection.connect();

    connection.query('SELECT * FROM users', function (error, rows, fields) {
        
        if (error) res.status(500).json({"status_code":500, "error_message" : "internal server error"});

        for (let index = 0; index < rows.length; index++) {
            var data = {
                'username' : rows[index].username,
                'email' : rows[index].email,
                'id' : rows[index].id,
            };

            user.push(data);   
        }
        
        // menampilkan users pug
        console.log(user);
        var nama = req.session.username;
        res.render(userPug,{'users' : user,'usersname' : nama});
    });
});

app.post('/users/add', (req, res) => {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    var connection = getMySQLConnection();
    connection.connect();
    if (username && password) {
        connection.query('SELECT * FROM users WHERE username = ?', username, function(error, result, fields) {
          if (result.length > 0) {
            res.render('reg',{'msg' : `This username : ${username}, is has been used !`})
            res.end()
          } else {
                var sqlinsert = `INSERT INTO users VALUES( null , ? , md5(?) , ? , 1)`;
                var params = [username,password,email];

                connection.query(sqlinsert, params, (error, result) => {
                      if (error) {
                            throw error;
                        }
                        res.redirect('/users')
                })
          }
        })
    }
})

app.post('/users/edit', (req, res) => {
    if(req.session.loggedin) {
        var email       = req.body.email;
        var username    = req.body.username;
        var id          = req.body.id;
        var sql = 'UPDATE users SET email=?, username=? WHERE id=?';
        connection.query(sql, [email, username, id], (error, results) => {
            if(error) throw error
            res.redirect('/users');
        }); 
    } else {
        res.redirect('/')
    }
})

app.post('/deleteUser',(req, res) => {
    if(req.session.loggedin) {
        var sql = "DELETE FROM users WHERE id="+req.body.id+"";
        connection.query(sql, function (err, results) {
            if(err)
            {
                throw err;
            }

            res.redirect('/users');
            res.end();
        });
    } else {
        res.redirect('/')
    }
});

// produk
app.get('/produk', function (req, res) {
    
    var produk = [];

    connection.query('SELECT * FROM produk', function (error, rows, fields) {
        
        if (error) res.status(500).json({"status_code":500, "error_message" : "internal server error"});

        for (let index = 0; index < rows.length; index++) {
            var item = {
                'kode_produk' : rows[index].kode_produk,
                'nama_produk' : rows[index].nama_produk,
                'kategori' : rows[index].kategori,
                'harga_produk' : rows[index].harga_produk,
                'stok_produk' : rows[index].stok_produk,
                'foto' : rows[index].foto,
                'id'    : rows[index].id
            };

            produk.push(item);   
        }
        
        // menampilkan produk pug
        // console.log(produk);
        var nama = req.session.username;
        res.render(produkPug,{'produks' : produk, 'usersname' : nama});
    });
});

app.post('/produk', (req, res) => {
    var post  = req.body;
    var kode_produk= post.kode_produk;
    var nama_produk= post.nama_produk;
    var kategori= post.kategori;
    var harga_produk= post.harga_produk;
    var stok_produk= post.stok_produk;
    if (req.files){

          var file = req.files.foto;
          var date = Date.now();
          var filename = date + '-' + file.name;
          var params = [kode_produk, nama_produk, kategori, harga_produk, stok_produk, filename];
        //   console.log(params);
          if(file.mimetype == "image/jpeg"|| file.mimetype == "image/jpg" ||file.mimetype == "image/png"||file.mimetype == "image/gif" ){
            file.mv('public/img/produk/'+filename, (err) => {
              if (err) return res.status(500).send(err);
              var sql = "INSERT INTO produk VALUES (null,?,?,?,?,?,?)";
              connection.query(sql, params, (err, result) => {
                res.redirect('/produk');
              });
            })

          } else {
            res.redirect('/produk')
          }

    }else {
      res.redirect('/produk');
    }

})

app.post('/editProduk', (req, res) => {
    var kode_produk  = req.body.kode_produk;
    var nama_produk = req.body.nama_produk;
    var kategori   = req.body.kategori;
    var harga_produk    = req.body.harga_produk;
    var stok_produk    = req.body.stok_produk;
    var id          = req.body.id;
    
    if (req.files) {
        var file = req.files.foto;
        var fotoLama = req.body.fotoLama;
        var date = Date.now();
        var filename = date + '-' + file.name;
        var params = [kode_produk, nama_produk, kategori, harga_produk, stok_produk,filename, id]; 
        // console.log(fotoLama);
        if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/jpg' || file.mimetype == 'image/png' || file.mimetype == 'image/gif') {
            file.mv('./public/img/produk/'+filename, (error) => {

                if(error) return res.status(500).send(error);
                var sql = 'UPDATE produk SET kode_produk=?, nama_produk=?, kategori=?, harga_produk=?, stok_produk=?, foto=? WHERE id=?';
                connection.query(sql, params, (error, result) => {
                    path = './public/img/produk/'+fotoLama;
                    try {
                        fs.unlinkSync(path);
                        res.redirect('/produk');
                    } catch (error) {
                        console.log(error);
                    }
                })
            })
        } else {
            console.log('Penambahan Data Gagal1')
            res.redirect('/produk');
        }
    } else {
        var params = [kode_produk, nama_produk, kategori, harga_produk, stok_produk, id]; 
        var sql = 'UPDATE produk SET kode_produk=?, nama_produk=?, kategori=?, harga_produk=?, stok_produk=? WHERE id=?';
                connection.query(sql, params, (error, result) => {
                    console.log('Penambahan Data Brhassil')
                    res.redirect('/produk');
                })
    }
})

app.post('/deleteProduk', (req, res) => {
    var id = req.body.id;
    var foto = req.body.foto;
    var sql = 'DELETE FROM produk WHERE id = ?';
    console.log(id);
    connection.query(sql, id, function (error, result) {
        if (error) console.log(error);
        // delete foto
        path = `./public/img/produk/${foto}`;
            try {
            //file removed
            fs.unlinkSync(path)
            // kode untuk direct ke produk
            res.redirect('/produk')
            } catch(err) {
            console.error(err)
            }
    })
})

app.get('/logout', (req, res) => {
      req.session.destroy();
      res.redirect('/')
  });
  
app.get('*', (req,res) => {
    res.send(`<h1>404:Halaman Tidak Dikenal</h1>`);
});

app.listen(3000);