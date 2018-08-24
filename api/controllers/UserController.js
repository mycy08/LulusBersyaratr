/**
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var bcrypt = require('bcrypt')
var fs = require('fs')
var Isemail = require('isemail')
var url = require('url');
function validateForm(email) {
  var x = email;
  var atpos = x.indexOf("@");
  var dotpos = x.lastIndexOf(".");
  if (atpos < 1 || dotpos < atpos + 2 || dotpos + 2 >= x.length) {

    return false;
  }
  else {
    return true;
  }
}
var moment = require('moment');
module.exports = {

  userProfile: function (req, res, next) {
    User.findOne(req.param('id')).populateAll().exec(function (err, user) {
      if (err) {
        return res.serverError(err);
      } else {
        user.anfavStrings = []
        async.each(user.anime_favorits, function (anfav, callback) {
          Anime.findOne({ id: anfav.owner_anime }).exec(function (err, anfavs) {
            if (err) {
              callback(err)
            } else {

              user.anfavStrings.push({
                id_fav: anfav.id,
                id: anfavs.id,
                nama_anime: anfavs.nama_anime,
                photo_url: anfavs.photo_url,
                deskripsi: anfavs.deskripsi
              })
              callback()
            }
          })
        }, function (err) { // function ini akan jalan bila semua genre_lists telah diproses

          if (err) {
            return res.serverError(err);
          }
          else {
            Genre.find().exec(function (err, genre) {
              if (req.session.User) {
                Notifikasi.find({ id_user: req.session.User.id }).sort('updatedAt DESC').exec(function (err, notif) {
                  Notifikasi.count({ id_user: req.session.User.id, status: "false" }).sort('updatedAt DESC').exec(function (err, countNotif) {
                    User.findOne(req.session.User.id).exec(function (err, us) {
                      if (err) return res.serverError(err)
                      if (us.status == "Banned") {
                        req.session.destroy()
                        req.redirect('/login');
                      }
                      else {
                        res.view("user/profile", {
                          notif: notif,
                          genre: genre,
                          status: 'OK',
                          moment: moment,
                          title: 'Profil',
                          user: user,
                          countNotif: countNotif
                        })
                      }
                    })

                  })

                })

              }
              else {
                res.view("user/profile", {
                  genre: genre,
                  moment: moment,
                  status: 'OK',
                  title: 'Prorfil',
                  user: user
                })
              }

            })

          }
        })
      }
    })
  },
  editProfile: function (req, res, next) {
    User.findOne(req.param('id'), function (err, editProfile) {
      if (err) {
        return res.serverError(err)
      }
      else {
        Genre.find().exec(function (err, genre) {
          if (req.session.User) {
            Notifikasi.find({ id_user: req.session.User.id }).sort('updatedAt DESC').exec(function (err, notif) {
              Notifikasi.count({ id_user: req.session.User.id, status: "false" }).sort('updatedAt DESC').exec(function (err, countNotif) {
                User.findOne(req.session.User.id).exec(function (err, us) {
                  if (err) return res.serverError(err)
                  if (us.status == "Banned") {
                    req.session.destroy()
                    res.redirect('/login');
                  }
                  else {
                    return res.view('user/edit-profile', {
                      notif: notif,
                      status: 'OK',
                      title: 'Edit Profil',
                      moment: moment,
                      genre: genre,
                      editProfile: editProfile,
                      countNotif: countNotif
                    })
                  }
                })

              })

            })
          }
          else {
            return res.view('user/edit-profile', {
              status: 'OK',
              title: 'Edit Profil',
              moment: moment,
              genre: genre,
              editProfile: editProfile
            })
          }

        })

      }
    })
  },
  updateProfile: function (req, res, next) {
    var userObj = {
      nama: req.param('nama'),
      tgl_lahir: req.param('tgl_lahir'),
      jenis_kelamin: req.param('jenis_kelamin'),
      email: req.param('email'),
      no_hp: req.param('no_hp')
    }

    if (req.param('no_hp').length > 12 || req.param('no_hp').length < 11) {
      var failedNohp = [
        'Nomor Hp yang Anda masukan salah'
      ]
      req.session.flash = {
        err: failedNohp
      }
      res.redirect('/edit-profile/' + req.param('id'));
      return
    }
    else {
      User.update(req.param('id'), userObj, function (err) {

        if (err) {
          console.log(err);
        }
        else {
          var ubahSuccess = [
            'Biodata Sudah berhasil diubah',
          ]
          req.session.flash = {
            err: ubahSuccess
            // If error redirect back to sign-up page
          }
          res.redirect('/profile/' + req.param('id'));
        }
      })
    }


  },
  gantiPassword: function (req, res, next) {
    User.findOne(req.param('id')).exec(function (err, user) {
      if (req.param('password_lama') == req.param('password_baru')) {
        console.log("bener")
        bcrypt.genSalt(10, function (err, salt) {
          bcrypt.hash(req.param('password_baru'), salt, function (err, hash) {
            if (err) {
              console.log(err);
            } else {
              var passObj = {
                password: hash
              }
              User.update(req.param('id'), passObj, function (err) {

                if (err) {
                  console.log(err);
                }
                else {
                  var ubahPass = [
                    'Password berhasil diubah, Silahkan Login kembali !',
                  ]
                  req.session.flash = {
                    err: ubahPass
                    // If error redirect back to sign-up page
                  }
                  res.redirect('/login/');
                }
              })
            }
          });
        });
      }
      else {
        var usernamePasswordMismatchError = [
          "Konfirmasi password tidak sama dengan Kata sandi baru !"
        ]
        req.session.flash = {
          err: usernamePasswordMismatchError
        }
        res.view("user/ganti-sandi/", {
          layout: false,
          status: 'OK',
          title: 'Aktivasi Akun',
          user: user
        })
      }
    })

  },
  updateProfilPassword: function (req, res, next) {
    User.findOne(req.param('id'), function (err, pass) {
      if (err) {
        console.log(err)
      }
      else {
        bcrypt.compare(req.param('password_lama'), pass.password, function (err, valid) {
          if (err) return next(err);

          // If the password from the form doesn't match the password from the database...
          if (!valid) {
            var usernamePasswordMismatchError = [
              "Password Lama Anda salah"
            ]
            req.session.flash = {
              err: usernamePasswordMismatchError
            }
            res.redirect('/profile/' + req.param('id'));
            return;
          }
          else {
            var passbaru
            bcrypt.genSalt(10, function (err, salt) {
              bcrypt.hash(req.param('password_baru'), salt, function (err, hash) {
                if (err) {
                  console.log(err);
                } else {
                  var passObj = {
                    password: hash
                  }
                  User.update(req.param('id'), passObj, function (err) {

                    if (err) {
                      console.log(err);
                    }
                    else {
                      var ubahPass = [
                        'Password berhasil diubah',
                      ]
                      req.session.flash = {
                        err: ubahPass
                        // If error redirect back to sign-up page
                      }
                      res.redirect('/profile/' + req.param('id'));
                    }
                  })
                }
              });
            });

          }
        })
      }
    })
  },
  uploadPhotoProfil: function (req, res) {

    req.file('photo_url')
      .upload({
        maxBytes: 2000000,
        dirname: '../../assets/images/user'
      }, function (err, uploads) {

        if (err) {
          var failedNohp = [
            'Gambar Harus Maksimal 2Mb'
          ]
          req.session.flash = {
            err: failedNohp
          }
          res.redirect('/profile/' + req.param('id'))
          return

        }
        if (uploads.length === 0) { return res.badRequest('No file was uploaded') }

        var id = User.id;
        var photo = User.photo;
        var fd = uploads[0].fd;
        var nameImage = fd.substring(61)


        if (nameImage.split('.').pop() == "jpg" || nameImage.split('.').pop() == "png") {
          User.update({ id: req.param('id') }
            ,
            {
              photo_url: nameImage
            }).exec(function (err, file) {
              if (err) { return res.serverError(err) }
              var sukses = [
                'Photo Profil berhasil diubah'
              ]
              req.session.flash = {
                err: sukses
              }
              setTimeout(
                function () {
                  res.redirect('/profile/' + req.param('id'))
                },
                6000
              )
            })
        }
        else {
          link = 'assets/images/user/' + nameImage
          fs.unlink(link, function (err) {
            if (err) return console.log(err); // handle error as you wish
            var failed = [
              'Photo Profil harus berformat jpg/png'
            ]
            req.session.flash = {
              err: failed
            }
            res.redirect('/profile/' + req.param('id'));
            // file deleted... continue your logic
          });

        }

      })

  },



  create: function (req, res, next) {

    if (validateForm(req.param('email'))) {
      User.findOneByEmail(req.param('email'), function (err, user) {

        if (user) {
          var emailAlready = [
            'Email sudah terdaftar. gunakan email lain untuk mendaftar'
          ]
          req.session.flash = {
            err: emailAlready
          }
          res.redirect('/register');
          return
        }
        else {

          if (req.param('no_hp').length > 12 || req.param('no_hp').length < 11) {
            var failedNohp = [
              'Nomor Hp yang Anda masukan salah'
            ]
            req.session.flash = {
              err: failedNohp
            }
            res.redirect('/register');
            return
          }
          else {
            User.findOne({ no_hp: req.param('no_hp') }).exec(function (err, user) {
              if (user) {
                var nohpready = [
                  'Nomor Hp sudah terdaftar. gunakan Nomor Hp lain untuk mendaftar'
                ]
                req.session.flash = {
                  err: nohpready
                }
                res.redirect('/register');
                return
              }
              else {
                var kode = Math.floor(Math.random() * 90000) + 10000;
                var userObj = {
                  email: req.param('email'),
                  password: req.param('password'),
                  nama: req.param('nama'),
                  no_hp: req.param('no_hp'),
                  kode_verifikasi: kode,
                  status: "false"
                }
                User.create(userObj).exec(function (err, user) {
                  if (err) {
                    console.log(err);

                  }
                  else {
                    User.findOneByEmail(req.param('email'), function foundUser(err, user) {
                      if (err) return next(err);


                      if (!user) {
                        var noAccountError = [
                          "Email Belum Terdaftar"
                        ]
                        req.session.flash = {
                          err: noAccountError
                        }
                        res.redirect('/login');
                        return;
                      }

                      else {
                        mailer.sendWelcomeMail(user)
                        var kodeSalah = [
                          "Kode yang Anda masukan salah, Cek email Anda untuk melihat Kode !"
                        ]
                        req.session.flash = {
                          err: kodeSalah
                        }
                        res.view("user/akun-aktivasi", {
                          layout: false,
                          status: 'OK',
                          title: 'Aktivasi Akun',
                          user: user
                        })
                      }


                    });
                  }
                })
              }
            })

          }

        }
      })
    }



    else {
      var emailSal = [
        'Format email yang anda masukan salah'
      ]
      req.session.flash = {
        err: emailSal
      }
      res.redirect('/register');
      return
    }

  },

  //mobile
  gantiPasswordMobile: function (req, res, next) {
    User.findOne(req.param('email')).exec(function (err, user) {
      if (req.param('password_lama') == req.param('password_baru')) {
        console.log("bener")
        bcrypt.genSalt(10, function (err, salt) {
          bcrypt.hash(req.param('password_baru'), salt, function (err, hash) {
            if (err) {
              console.log(err);
            } else {
              var passObj = {
                password: hash
              }
              User.update(req.param('id'), passObj, function (err) {

                if (err) {
                  console.log(err);
                }
                else {
                  var ubahPass = [
                    'Password berhasil diubah, Silahkan Login kembali !',
                  ]
                  req.session.flash = {
                    err: ubahPass
                    // If error redirect back to sign-up page
                  }
                  res.json(200, { pesan: "sukses" });
                }
              })
            }
          });
        });
      }
      else {
        var usernamePasswordMismatchError = [
          "Konfirmasi password tidak sama dengan Kata sandi baru !"
        ]
        req.session.flash = {
          err: usernamePasswordMismatchError
        }
        res.json(202, { pesan: "password tidak sama" })
      }
    })

  },
  profileMobile: function (req, res, next) {
    var email = req.param('email')
    User.findOne({ email: email }).populateAll().exec(function (err, user) {
      if (err) {
        return res.serverError(err);
      }
      if (!user) {
        return res.notFound('Could not find email, sorry.');
      }


      res.json(user)
    });

  },
  animeFavoritMobile: function (req, res, next) {
    User.findOne({ email: req.param('email') }).populateAll().exec(function (err, user) {
      if (err) {
        return res.serverError(err);
      } else {
        user.anfavStrings = []
        async.each(user.anime_favorits, function (anfav, callback) {

          Anime.findOne({ id: anfav.owner_anime }).exec(function (err, anfavs) {
            if (err) {
              callback(err)
            } else {

              user.anfavStrings.push({
                id_fav: anfav.id,
                id: anfavs.id,
                total: user.anime_favorits.length,
                nama_anime: anfavs.nama_anime,
                photo_url: anfavs.photo_url,
                deskripsi: anfavs.deskripsi,
                createdAt: anfav.createdAt
              })
              callback()
            }
          })
        }, function (err) { // function ini akan jalan bila semua genre_lists telah diproses

          if (err) {
            return res.serverError(err);
          }
          else {

            // console.log(user.anfavStrings.sort(function(a, b){return b.createdAt - a.createdAt}))
            res.json(user.anfavStrings.sort(function (a, b) { return b.createdAt - a.createdAt }))

          }
        })
      }
    })

  },
  uploadPhotoProfilMobile: function (req, res) {
    req.file('file') // this is the name of the file in your multipart form
      .upload({
        maxBytes: 2000000,
        dirname: '../../assets/images/user'
      }, function (err, uploads) {
        if (err) {
          var failedNohp = [
            'Gambar Harus Maksimal 2Mb'
          ]
          req.session.flash = {
            err: failedNohp
          }
          res.json(202, { pesan: "Gambar harus maksimal 2Mb" })

        }
        if (uploads.length === 0) { return res.badRequest('No file was uploaded') }
        var id = User.id;
        var photo = User.photo;
        var fd = uploads[0].fd;
        var nameImage = fd.substring(61)
        if (nameImage.split('.').pop() == "jpg" || nameImage.split('.').pop() == "png") {
          User.update({ id: req.param('id') }
            ,
            {
              photo_url: nameImage
            }).exec(function (err, file) {
              if (err) { return res.serverError(err) }
              setTimeout(
                function () {
                  res.json(200, { pesan: "Sukses" });
                },
                6000
              )

            })
        }
        else {
          link = 'assets/images/user/' + nameImage
          fs.unlink(link, function (err) {
            if (err) return console.log(err);
            res.json(201, { pesan: "failed" })
          });

        }


      })

  },

  updateMobile: function (req, res, next) {
    User.update(req.param('id'), req.params.all(), function userUpdated(err, user) {
      if (err) {
        return res.redirect('/user/' + req.param('id'));
      }
      if (user)
        res.json(user);
    });
  },
  createMobile: function (req, res, next) {
    User.findOneByEmail(req.param('email'), function (err, user) {
      if (user) {
        var emailAlready = [
          'Email sudah terdaftar. gunakan email lain untuk mendaftar'
        ]
        req.session.flash = {
          err: emailAlready
        }
        res.json(500, { pesan: 'emailReady' });
        return
      }
      else {

        if (req.param('no_hp').length > 12 || req.param('no_hp').length < 11) {
          var failedNohp = [
            'Nomor Hp yang Anda masukan salah'
          ]
          req.session.flash = {
            err: failedNohp
          }
          res.redirect('/register');
          return
        }
        else {
          User.findOne({ no_hp: req.param('no_hp') }).exec(function (err, user) {
            if (user) {
              var nohpready = [
                'Nomor Hp sudah terdaftar. gunakan Nomor Hp lain untuk mendaftar'
              ]
              req.session.flash = {
                err: nohpready
              }
              res.json(501, { pesan: 'nomorReady' });
              return
            }
            else {
              var kode = Math.floor(Math.random() * 90000) + 10000;
              var userObj = {
                email: req.param('email'),
                password: req.param('password'),
                nama: req.param('nama'),
                no_hp: req.param('no_hp'),
                kode_verifikasi: kode,
                status: "false"
              }
              User.create(userObj).exec(function (err, user) {
                if (err) {
                  console.log(err);

                }
                else {
                  var daftarSuccess = [
                    'Email sudah berhasil didaftar. Silahkan Login'
                  ]
                  req.session.flash = {
                    err: daftarSuccess
                    // If error redirect back to sign-up page
                  }
                  mailer.sendWelcomeMail(user)
                  res.json(200, { pesan: 'true' });
                  return;
                }
              })
            }
          })

        }

      }
    })
  },
  updateProfilPasswordMobile: function (req, res, next) {
    User.findOne(req.param('id'), function (err, pass) {
      if (err) {
        console.log(err)
      }
      else {
        bcrypt.compare(req.param('password_lama'), pass.password, function (err, valid) {
          if (err) return next(err);

          // If the password from the form doesn't match the password from the database...
          if (!valid) {
            var usernamePasswordMismatchError = [
              "Password Lama Anda salah"
            ]
            req.session.flash = {
              err: usernamePasswordMismatchError
            }
            res.send('false')
            return;
          }
          else {
            var passbaru
            bcrypt.genSalt(10, function (err, salt) {
              bcrypt.hash(req.param('password_baru'), salt, function (err, hash) {
                if (err) {
                  console.log(err);
                } else {
                  var passObj = {
                    password: hash
                  }
                  User.update(req.param('id'), passObj, function (err, userUpdated) {

                    if (err) {
                      console.log(err);
                    }
                    else {
                      var ubahPass = [
                        'Password berhasil diubah',
                      ]
                      req.session.flash = {
                        err: ubahPass
                        // If error redirect back to sign-up page
                      }
                      res.send('true');
                    }
                  })
                }
              });
            });

          }
        })
      }
    })
  },
  animeFavoritMobile: function (req, res, next) {
    User.findOne({ email: req.param('email') }).populateAll().exec(function (err, user) {
      if (err) {
        return res.serverError(err);
      } else {
        user.anfavStrings = []
        async.each(user.anime_favorits, function (anfav, callback) {

          Anime.findOne({ id: anfav.owner_anime }).exec(function (err, anfavs) {
            if (err) {
              callback(err)
            } else {

              user.anfavStrings.push({
                id_fav: anfav.id,
                id: anfavs.id,
                total: user.anime_favorits.length,
                nama_anime: anfavs.nama_anime,
                photo_url: anfavs.photo_url,
                deskripsi: anfavs.deskripsi,
                createdAt: anfav.createdAt
              })
              callback()
            }
          })
        }, function (err) { // function ini akan jalan bila semua genre_lists telah diproses

          if (err) {
            return res.serverError(err);
          }
          else {

            // console.log(user.anfavStrings.sort(function(a, b){return b.createdAt - a.createdAt}))
            res.json(user.anfavStrings.sort(function (a, b) { return b.createdAt - a.createdAt }))

          }
        })
      }
    })

  }
}