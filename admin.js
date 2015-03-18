var express = require('express');
var router = express.Router();
var constants = require('../constants');

router.get('/', function(req, res){
	if(req.session.admin)
	{
		res.redirect('/admin/dashboard');
	}
	else
	{
		res.render('admin/adminlogin', { title: 'Admin Login', bodyclass: 'adminlogin' });
	}
});//default route

router.post('/', function(req, res){
	var collection = req.db.get('adminscollection');
	var selectPromise = collection.find({}, {sort: {'last_updated': -1}});
	
	selectPromise.on('error', function(err){
		res.render('error', {'title': 'Error', 'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		if( (req.body.username==doc[0].username) && (req.body.password==doc[0].password) )
		{
			req.session.admin = {'username': doc.username};
			res.redirect('/admin/dashboard');
		}
		else
		{
			res.render('admin/adminlogin', { title: 'Admin Login', bodyclass: 'adminlogin', 'response_msg': 'Invalid login details.' });
		}		
	});//promise success
});//login submit route


router.get('/dashboard', checkAdminSession, function(req, res){
	res.render('admin/dashboard', { 'flash_message': req.flash('flash_message')});
});//admin dashboard

router.get('/logout', checkAdminSession, function(req, res){
	req.session.admin = null;
	res.redirect('/admin');
});//logout

router.get('/changelogin', checkAdminSession, function(req, res){
	res.render('admin/changelogin', {'title': 'Change Login Details'});
});//change login

router.post('/changelogin', checkAdminSession, function(req, res){
	var formdata = req.body;
	formdata.last_updated = new Date();
	var collection = req.db.get('adminscollection');
	
	var updatePromise = collection.update({}, {$set: {'username': formdata.username, 'password': formdata.password, 'last_updated': formdata.last_updated}});
	
	updatePromise.on('error', function(err){
		res.render('error', {'title': 'Title', 'error': err});
	});//promise error
	
	updatePromise.on('success', function(doc){
		req.flash('flash_message', 'Login details have been successfully changed.');
		res.redirect('/admin/dashboard');
	});//promise success
});//change login



//POLICY CATEGORY ROUTES
router.get('/addcategory', checkAdminSession, function(req, res){
	res.render('admin/addcategory', {'title': 'Add New Category'});
});//add category

router.post('/addcategory', checkAdminSession, checkUniqueTitle, function(req, res){
	var formidable = require('formidable');
	var util = require('util');
	var fs = require('fs-extra');
	var form = new formidable.IncomingForm();
	
	form.parse(req, function(err, fields, files) {
		var temp_path = files.image.path;
        var file_name = files.image.name;
		var type = files.image.type;
		var extension = '.jpg';
		if( type == 'image/png' )
			extension = '.png';
		
		var file_name = new Date().getTime() + extension;
        var new_location = constants.category_img_path;
		
		fs.copy(temp_path, new_location + file_name, function(err) {  
            if (err) {
                console.error(err);
				res.render('error', {'title': 'Error', 'error': err});
            } else {
			
				fields.image = file_name;
				fields.created = new Date();
				fields.last_updated = fields.created;
				
				var collection = req.db.get('categoriescollection');
	
				var insertPromise = collection.insert( fields );
				insertPromise.on('error', function(err){
					res.render('error', {'title': 'Error', 'error': err});
					fs.unlink(new_location+file_name);
				});//promise error
				insertPromise.on('success', function(doc){
					req.flash('flash_message', 'New category has been successfully saved.');
					res.redirect('/admin/viewcategory/'+doc._id);
				});//promise success	
            }
        });
	});//parse
	
});//add category

router.get('/viewcategories', checkAdminSession, function(req, res){
	var db = req.db;
	var collection = db.get('categoriescollection');
	
	var selectPromise = collection.find({}, {sort: {'last_updated': -1}});
	
	selectPromise.on('error', function(err){
		res.render('error', {'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		res.render('admin/viewcategories', {'title': 'View All Categories', 'categories': doc, 'flash_message': req.flash('flash_message')});
	});//promise success
});//view all categories


router.get('/viewcategory/:id', checkAdminSession, function(req, res){
	var db = req.db;
	var id = req.params.id;
	
	var collection = db.get('categoriescollection');
	
	var selectPromise = collection.findById(id);
	
	selectPromise.on('error', function(err){
		res.render('error', {'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		res.render('admin/viewcategory', {'title': 'View Category Details', 'category': doc, 'flash_message': req.flash('flash_message')});
	});//promise success
});//view category details


router.get('/editcategory/:id', checkAdminSession, function(req, res){
	var db = req.db;
	var id = req.params.id;
	
	var collection = db.get('categoriescollection');
	
	var selectPromise = collection.findById(id);
	
	selectPromise.on('error', function(err){
		res.render('error', {'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		res.render('admin/editcategory', {'title': 'Edit Category Details', 'category': doc});
	});//promise success
});//edit category details


router.post('/editcategory', checkAdminSession, function(req, res){
	var formidable = require('formidable');
	var util = require('util');
	var fs = require('fs-extra');
	var form = new formidable.IncomingForm();
	
	form.parse(req, function(err, fields, files) {
		console.log( fields );
		var file_size = files.image.size;
		
		if( file_size > 0 )	//image also changed
		{
			var temp_path = files.image.path;
			var file_name = files.image.name;
			var type = files.image.type;
			var extension = '.jpg';
			if( type == 'image/png' )
				extension = '.png';
			
			var file_name = new Date().getTime() + extension;
			var new_location = constants.category_img_path;
			
			fs.copy(temp_path, new_location + file_name, function(err) {  
				if (err) {
					console.error(err);
					res.render('error', {'title': 'Error', 'error': err});
				} else {
								
					fields.image = file_name;
					fields.last_updated = new Date();
					
					var collection = req.db.get('categoriescollection');
					var updatePromise = collection.update({'_id': fields.id}, {$set: {'title': fields.title, 'title_th': fields.title_th, 'description': fields.description, 'description_th': fields.description_th, 'last_updated': fields.last_updated, 'image': fields.image}});
					updatePromise.on('error', function(err){
						res.render('error', {'title': 'Error', 'error': err});
						fs.unlink(new_location+file_name);
					});//promise error
					updatePromise.on('success', function(doc){
						fs.unlink(new_location+fields.old_image);
						req.flash('flash_message', 'Category details have been successfully updated.');
						res.redirect('viewcategory/'+fields.id);
					});//promise success	
				}
			});
		}//image also changed if ends
		else
		{
			fields.last_updated = new Date();					
			var collection = req.db.get('categoriescollection');
		
			var updatePromise = collection.update({'_id': fields.id}, {$set: {'title': fields.title, 'title_th': fields.title_th, 'description': fields.description, 'description_th': fields.description_th, 'last_updated': fields.last_updated}});
			updatePromise.on('error', function(err){
				res.render('error', {'title': 'Error', 'error': err});
			});//promise error
			updatePromise.on('success', function(doc){
				req.flash('flash_message', 'Category details have been successfully updated.');
				res.redirect('viewcategory/'+fields.id);
			});//promise success	
		}//image also changed else ends
	});//parse
});//edit category details


router.get('/deletecategory/:id', checkAdminSession, getCategoryImageName, function(req, res){
	var db = req.db;
	var id = req.params.id;
	
	var collection = db.get('categoriescollection');
	
	var deletePromise = collection.remove({'_id':id});
	
	deletePromise.on('error', function(err){
		res.render('error', {'title': 'Error', 'error': err});
	});//promise error
	
	deletePromise.on('success', function(doc){
		var fs = require('fs-extra');
		fs.unlink(constants.category_img_path+req.category.image);
		req.flash('flash_message', 'Specified category has been successfully deleted.');
		res.redirect('/admin/viewcategories');
	});//promise success
});//delete category








//VENDOR ROUTES

router.get('/viewvendors', checkAdminSession, function(req, res){
	var db = req.db;
	var collection = db.get('vendorscollection');
	
	var selectPromise = collection.find({}, {sort: {'last_updated': -1}});
	
	selectPromise.on('error', function(err){
		res.render('error', {'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		res.render('admin/viewvendors', {'title': 'View All Vendors', 'vendors': doc, 'flash_message': req.flash('flash_message')});
	});//promise success
});//view all vendors

router.get('/addvendor', checkAdminSession, function(req, res){
	res.render('admin/addvendor', {'title': 'Add New Vendor'});
});//add vendor

router.post('/addvendor', checkAdminSession, function(req, res){
	var formidable = require('formidable');
	var util = require('util');
	var fs = require('fs-extra');
	var form = new formidable.IncomingForm();
	
	form.parse(req, function(err, fields, files) {
		var temp_path = files.image.path;
        var file_name = files.image.name;
		var type = files.image.type;
		var extension = '.jpg';
		if( type == 'image/png' )
			extension = '.png';
		
		var file_name = new Date().getTime() + extension;
        var new_location = constants.vendor_img_path;
		
		fs.copy(temp_path, new_location + file_name, function(err) {  
            if (err) {
                console.error(err);
				res.render('error', {'title': 'Error', 'error': err});
            } else {
			
				var im = require('imagemagick');
				im.resize({
					srcPath: new_location+file_name,
					dstPath: new_location+file_name,
					width: 200
				},
				function(err, stdout, stderr){
					if(err)
						console.log(err);
				});
			
				fields.image = file_name;
				fields.created = new Date();
				fields.last_updated = fields.created;
				
				var collection = req.db.get('vendorscollection');
	
				var insertPromise = collection.insert( fields );
				insertPromise.on('error', function(err){
					res.render('error', {'title': 'Error', 'error': err});
					fs.unlink(new_location+file_name);
				});//promise error
				insertPromise.on('success', function(doc){
					req.flash('flash_message', 'New vendor has been successfully saved.');
					res.redirect('/admin/viewvendor/'+doc._id);
				});//promise success	
            }
        });
	});//parse
	
});//add vendor

router.get('/viewvendor/:id', checkAdminSession, function(req, res){
	var db = req.db;
	var id = req.params.id;
	
	var collection = db.get('vendorscollection');
	
	var selectPromise = collection.findById(id);
	
	selectPromise.on('error', function(err){
		res.render('error', {'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		res.render('admin/viewvendor', {'title': 'View Vendor Details', 'vendor': doc, 'flash_message': req.flash('flash_message')});
	});//promise success
});//view vendor details


router.get('/editvendor/:id', checkAdminSession, function(req, res){
	var db = req.db;
	var id = req.params.id;
	
	var collection = db.get('vendorscollection');
	
	var selectPromise = collection.findById(id);
	
	selectPromise.on('error', function(err){
		res.render('error', {'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		res.render('admin/editvendor', {'title': 'Edit Vendor Details', 'vendor': doc});
	});//promise success
});//edit vendor details


router.post('/editvendor', checkAdminSession, function(req, res){
	var formidable = require('formidable');
	var util = require('util');
	var fs = require('fs-extra');
	var form = new formidable.IncomingForm();
	
	form.parse(req, function(err, fields, files) {
		console.log( fields );
		var file_size = files.image.size;
		
		if( file_size > 0 )	//image also changed
		{
			var temp_path = files.image.path;
			var file_name = files.image.name;
			var type = files.image.type;
			var extension = '.jpg';
			if( type == 'image/png' )
				extension = '.png';
			
			var file_name = new Date().getTime() + extension;
			var new_location = constants.vendor_img_path;
			
			fs.copy(temp_path, new_location + file_name, function(err) {  
				if (err) {
					console.error(err);
					res.render('error', {'title': 'Error', 'error': err});
				} else {
				
					var im = require('imagemagick');
					im.resize({
						srcPath: new_location+file_name,
						dstPath: new_location+file_name,
						width: 200
					},
					function(err, stdout, stderr){
						if(err)
							console.log(err);
					});
				
					fields.image = file_name;
					fields.last_updated = new Date();
					
					var collection = req.db.get('vendorscollection');
					var updatePromise = collection.update({'_id': fields.id}, {$set: {'name': fields.name, 'name_th': fields.name_th, 'description': fields.description, 'description_th': fields.description_th, 'image': fields.image, 'last_updated': fields.last_updated}});
					updatePromise.on('error', function(err){
						res.render('error', {'title': 'Error', 'error': err});
						fs.unlink(new_location+file_name);
					});//promise error
					updatePromise.on('success', function(doc){
						fs.unlink(new_location+fields.old_image);
						req.flash('flash_message', 'Vendor details have been successfully updated.');
						res.redirect('viewvendor/'+fields.id);
					});//promise success	
				}
			});
		}//image also changed if ends
		else
		{
			fields.last_updated = new Date();
					
			var collection = req.db.get('vendorscollection');
		
			var updatePromise = collection.update({'_id': fields.id}, {$set: {'name': fields.name, 'name_th': fields.name_th, 'description': fields.description, 'description_th': fields.description_th, 'last_updated': fields.last_updated}});
			updatePromise.on('error', function(err){
				res.render('error', {'title': 'Error', 'error': err});
			});//promise error
			updatePromise.on('success', function(doc){
				req.flash('flash_message', 'Vendor details have been successfully updated.');
				res.redirect('viewvendor/'+fields.id);
			});//promise success	
		}//image also changed else ends
	});//parse
	
});//edit vendor details

router.get('/deletevendor/:id', checkAdminSession, getImageName, function(req, res){
	var db = req.db;
	var id = req.params.id;
	
	var collection = db.get('vendorscollection');
	
	var deletePromise = collection.remove({'_id':id});
	
	deletePromise.on('error', function(err){
		res.render('error', {'title': 'Error', 'error': err});
	});//promise error
	
	deletePromise.on('success', function(doc){
		var fs = require('fs-extra');
		fs.unlink(constants.vendor_img_path+req.vendor.image);
		req.flash('flash_message', 'Specified vendor has been successfully deleted.');
		res.redirect('/admin/viewvendors');
	});//promise success
});//delete vendor











//POLICY ROUTES

router.get('/addpolicy', checkAdminSession, getVendorsList, getCategoriesList, function(req, res){
	res.render('admin/addpolicy', {'title': 'Add New Policy', 'vendors': req.vendors, 'categories': req.categories});
});//add policy

router.post('/addpolicy', checkAdminSession, function(req, res){
	var formidable = require('formidable');
	var util = require('util');
	var fs = require('fs-extra');
	var form = new formidable.IncomingForm();
	
	form.parse(req, function(err, fields, files) {
		var temp_path = files.brochure.path;
        var file_name = files.brochure.name;
		var file_size = files.brochure.size;
		file_name = file_name.replace(/\s/gi, "-");
		file_name = new Date().getTime() + file_name;
        var new_location = constants.brochure_path;
		
		fs.copy(temp_path, new_location + file_name, function(err) {  
            if (err) {
                console.error(err);
				res.render('error', {'title': 'Error', 'error': err});
            } else {
				if( file_size == 0  )
				{
					fields.brochure = '';
					fs.unlink( new_location+file_name );
				}
				else
				{
					fields.brochure = file_name;
				}
				
				fields.created = new Date();
				fields.last_updated = fields.created;
				
				var stime_arr = fields.start_time_d.split("/");
				fields.start_time = new Date( stime_arr[2], stime_arr[0]-1, stime_arr[1], fields.start_time_h, fields.start_time_m);
				
				var etime_arr = fields.end_time_d.split("/");
				fields.end_time = new Date( etime_arr[2], etime_arr[0]-1, etime_arr[1], fields.end_time_h, fields.end_time_m);
				fields.min_age = parseInt( fields.min_age );
				fields.max_age = parseInt( fields.max_age );
				fields.min_sum_insured = parseInt( fields.min_sum_insured );
				fields.max_sum_insured = parseInt( fields.max_sum_insured );
				
				delete fields.start_time_d;
				delete fields.start_time_h;
				delete fields.start_time_m;
				delete fields.end_time_d;
				delete fields.end_time_h;
				delete fields.end_time_m;
				
				var collection = req.db.get('policiescollection');
				var Converter=require("csvtojson").core.Converter;
				var csvConverter=new Converter({constructResult:true});
				
				var policyFileStream=fs.createReadStream(files.policy_details_csv.path);
				csvConverter.on("end_parsed",function(jsonObj){
					fields.policy_details = jsonObj;
					
					premiumFileStream = fs.createReadStream( files.premium_details_csv.path );
					var csvConverter2 = new Converter({constructResult: true});
					csvConverter2.on('end_parsed', function(jsonObj2){
						fields.premium_details = jsonObj2;
						
						var insertPromise = collection.insert( fields );
						insertPromise.on('error', function(err){
							fs.unlink(new_location+file_name);
							res.render('error', {'title': 'Error', 'error': err});
						});//promise error
						insertPromise.on('success', function(doc){
							req.flash('flash_message', 'New policy has been successfully saved.');
							res.redirect('/admin/viewpolicy/'+doc._id);
						});//promise success		
					});						
					premiumFileStream.pipe(csvConverter2);
					
				});					
				policyFileStream.pipe(csvConverter);
				}
        });
	});//parse
	
});//add policy

router.get('/viewpolicies', checkAdminSession, function(req, res){
	var db = req.db;
	var collection = db.get('policiescollection');
	
	var selectPromise = collection.find({}, {sort: {'last_updated': -1}});
	
	selectPromise.on('error', function(err){
		res.render('error', {'title': 'Error', 'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		res.render('admin/viewpolicies', {'title': 'View All Policies', 'policies': doc, 'flash_message': req.flash('flash_message')});
	});//promise success
});//view all policies

router.get('/deletepolicy/:id', checkAdminSession, getBrochureName, function(req, res){
	var db = req.db;
	var id = req.params.id;
	
	var collection = db.get('policiescollection');
	
	var deletePromise = collection.remove({'_id':id});
	
	deletePromise.on('error', function(err){
		res.render('error', {'title': 'Error', 'error': err});
	});//promise error
	
	deletePromise.on('success', function(doc){
		var fs = require('fs-extra');
		fs.unlink(constants.brochure_path+req.policy.brochure);
		req.flash('flash_message', 'Specified policy has been successfully deleted.');
		res.redirect('/admin/viewpolicies');
	});//promise success
});//delete policy



router.get('/viewpolicy/:id', checkAdminSession, function(req, res){
	var db = req.db;
	var id = req.params.id;
	
	var collection = db.get('policiescollection');
	
	var selectPromise = collection.findById(id);
	
	selectPromise.on('error', function(err){
		res.render('error', {'title': 'Error', 'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		res.render('admin/viewpolicy', {'title': 'View Policy Details', 'policy': doc, 'flash_message': req.flash('flash_message')});
	});//promise success
});//view policy details


router.get('/editpolicy/:id', checkAdminSession, getVendorsList, getCategoriesList, function(req, res){
	var db = req.db;
	var id = req.params.id;
	
	var collection = db.get('policiescollection');
	
	var selectPromise = collection.findById(id);
	
	selectPromise.on('error', function(err){
		res.render('error', {'title': 'Title', 'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		res.render('admin/editpolicy', {'title': 'Edit Policy Details', 'policy': doc, 'vendors': req.vendors, 'categories': req.categories});
	});//promise success
});//edit policy details


router.post('/editpolicy', checkAdminSession, function(req, res){
	var formidable = require('formidable');
	var util = require('util');
	var fs = require('fs-extra');
	var form = new formidable.IncomingForm();
	
	form.parse(req, function(err, fields, files) {
		var temp_path = files.brochure.path;
        var file_name = files.brochure.name;
		var file_size = files.brochure.size;
		file_name = file_name.replace(/\s/gi, "-");
		file_name = new Date().getTime() + file_name;
        var new_location = constants.brochure_path;
		
		fs.copy(temp_path, new_location + file_name, function(err) {  
            if (err) {
                console.error(err);
				res.render('error', {'title': 'Error', 'error': err});
            } else {
				if( file_size == 0  )
				{
					console.log('file size zero');
					fields.brochure = fields.old_brochure;
					fs.unlink( new_location+file_name );
				}
				else
				{
					fields.brochure = file_name;
				}
				
				var policy_details = [];
				
				var pd_year = fields.pd_year.split(',');
				var pd_payout_rate = fields.pd_payout_rate.split(',');
				var pd_i_premium_rate = fields.pd_i_premium_rate.split(',');
				var pd_cmpd_sum_insured_rate = fields.pd_cmpd_sum_insured_rate.split(',');
				var pd_dividend_yn = fields.pd_dividend_yn.split(',');
				var pd_premium_yn = fields.pd_premium_yn.split(',');
				
				delete fields.pd_year;
				delete fields.pd_payout_rate;
				delete fields.pd_i_premium_rate;
				delete fields.pd_cmpd_sum_insured_rate;
				delete fields.pd_dividend_yn;
				delete fields.pd_premium_yn;
				
				for( var i = 0; i < pd_year.length; i++ )
				{
					if( !isNaN( parseInt( pd_year[i] ) ) )
					{					
						var policy_detail = {};
						policy_detail['year'] = pd_year[i];
						policy_detail['payout_rate'] = pd_payout_rate[i];
						policy_detail['i_premium_rate'] = pd_i_premium_rate[i];
						policy_detail['cmpd_sum_insured_rate'] = pd_cmpd_sum_insured_rate[i];
						policy_detail['dividend_yn'] = pd_dividend_yn[i];
						policy_detail['premium_yn'] = pd_premium_yn[i];
						
						policy_details.push( policy_detail );
					}
				}
				console.log( policy_details );
				
				var premium_details = [];
				
				var prd_gender = fields.prd_gender.split(',');
				var prd_tobacco_accepted = fields.prd_tobacco_accepted.split(',');
				var prd_age = fields.prd_age.split(',');
				var prd_premium_rate = fields.prd_premium_rate.split(',');
				
				delete fields.prd_gender;
				delete fields.prd_tobacco_accepted;
				delete fields.prd_age;
				delete fields.prd_premium_rate;
				
				for( var i = 0; i < prd_gender.length; i++ )
				{
					var premium_detail = {};
					premium_detail['gender'] = prd_gender[i];
					premium_detail['tobacco_accepted'] = prd_tobacco_accepted[i];
					premium_detail['age'] = prd_age[i];
					premium_detail['premium_rate'] = prd_premium_rate[i];
					
					premium_details.push(premium_detail);
				}
				
				fields.policy_details = policy_details;
				fields.premium_details = premium_details;
				fields.last_updated = new Date();
				fields.start_time = new Date( fields.start_time );
				fields.end_time = new Date( fields.end_time );
				fields.min_age = parseInt( fields.min_age );
				fields.max_age = parseInt( fields.max_age );
				fields.min_sum_insured = parseInt( fields.min_sum_insured );
				fields.max_sum_insured = parseInt( fields.max_sum_insured );
				
				fields.active_yn = (fields.active_yn) ? '1' : '0';
				
				var stime_arr = fields.start_time_d.split("/");
				fields.start_time = new Date( stime_arr[2], stime_arr[0]-1, stime_arr[1], fields.start_time_h, fields.start_time_m);
				
				var etime_arr = fields.end_time_d.split("/");
				fields.end_time = new Date( etime_arr[2], etime_arr[0]-1, etime_arr[1], fields.end_time_h, fields.end_time_m);
				
				delete fields.start_time_d;
				delete fields.start_time_h;
				delete fields.start_time_m;
				delete fields.end_time_d;
				delete fields.end_time_h;
				delete fields.end_time_m;
				
				var collection = req.db.get('policiescollection');
				
				var updatePromise = collection.update({'_id': fields.id}, {$set: fields});
				updatePromise.on('error', function(err){
					fs.unlink(new_location+file_name);
					res.render('error', {'title': 'Error', 'error': err});
				});//promise error
				updatePromise.on('success', function(doc){
					if( file_size > 0  )
					{
						fs.unlink( new_location+fields.old_brochure);
					}
					req.flash('flash_message', 'Policy details have been successfully updated.');
					res.redirect('/admin/viewpolicy/'+fields.id);
				});//promise success	
            }
        });
	});//parse
	
});//edit policy







module.exports = router;


//MIDDLEWARE FUNCTIONS
function checkAdminSession( req, res, next )
{
	if( req.session.admin )
	{
		next();
	}
	else
	{
		res.redirect('/admin');
	}
}//checkAdminSession()

function checkUniqueTitle( req, res, next )
{
	console.log(req.body);
	var collection = req.db.get('categoriescollection');
	
	collection.findOne({"title": req.body.title}, function(err, doc){
		if(err)
		{
			res.render('error', {'error': err});
		}
		else
		{
			if(doc)
			{
				res.render('admin/addcategory', {'title': 'Add New Category', 'message': 'This title already exists.', 'formdata': req.body});
			}
			else
			{
				next();
			}
		}
	});
}//checkUniqueTitle()


function getVendorsList( req, res, next )
{
	var collection = req.db.get('vendorscollection');
	var selectPromise = collection.find({}, {fields: {description: 0, description_th: 0, created: 0, last_updated: 0}});
	
	selectPromise.on('error', function(err){
		res.render('error', {'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		req.vendors = doc;
		next();
	});//promise success
}//getVendorsList()


function getCategoriesList( req, res, next )
{
	var collection = req.db.get('categoriescollection');
	var selectPromise = collection.find({}, {fields: {description_th: 0, created: 0, last_updated: 0, description: 0, title_th: 0}});
	
	selectPromise.on('error', function(err){
		res.render('error', {'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		req.categories = doc;
		next();
	});//promise success
}//getCategoriesList()


function getImageName( req, res, next )
{
	var collection = req.db.get('vendorscollection');
	var selectPromise = collection.findById(req.params.id);
	
	selectPromise.on('error', function(err){
		res.render('error', {'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		req.vendor = doc;
		next();
	});//promise success
}//getImageName()

function getCategoryImageName( req, res, next )
{
	var collection = req.db.get('categoriescollection');
	var selectPromise = collection.findById(req.params.id);
	
	selectPromise.on('error', function(err){
		res.render('error', {'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		req.category = doc;
		next();
	});//promise success
}//getCategoryImageName()


function getBrochureName( req, res, next )
{
	var collection = req.db.get('policiescollection');
	var selectPromise = collection.findById(req.params.id);
	
	selectPromise.on('error', function(err){
		res.render('error', {'title': 'Error', 'error': err});
	});//promise error
	
	selectPromise.on('success', function(doc){
		req.policy = doc;
		next();
	});//promise success
}//getBrochureName()

function getPolicyDetailsFromCSV( req, res, next )
{
	var formidable = require('formidable');
	var util = require('util');
	var fs = require('fs-extra');
	var form = new formidable.IncomingForm();
	
	var Converter=require("csvtojson").core.Converter;
	var csvConverter=new Converter({constructResult:true});
	
	form.parse(req, function(err, fields, files) {
		if( files.policy_details_csv.size > 0 )
		{
			var policyFileStream=fs.createReadStream(files.policy_details_csv.path);
			csvConverter.on("end_parsed",function(jsonObj){
				console.log( jsonObj );
				next();
			});					
			policyFileStream.pipe(csvConverter);
		}
		else
		{
			next();
		}
	});//parse	
}//getPolicyDetailsFromCSV()