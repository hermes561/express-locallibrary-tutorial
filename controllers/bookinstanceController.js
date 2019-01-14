const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var BookInstance = require('../models/bookinstance');
var Book = require('../models/book');

var mongoose = require('mongoose');
var async = require('async');
var moment = require('moment');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {

  BookInstance.find()
    .populate('book')
    .sort({'status': 'asc'})
//    .sort({'ddue_back': 'desc'})
    .exec(function (err, list_bookinstances) {
      if (err) { return next(err); }
      // Successful, so render
     
      res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstances });
    });
    
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {
//    res.send('NOT IMPLEMENTED: BookInstance detail: ' + req.params.id);
    var id = mongoose.Types.ObjectId(req.params.id);
    BookInstance.findById(id)
    .populate('book')
    .exec(function (err, bookinstance) {
        if (err) { return next(err); }
        if(bookinstance == null) {
            var err = new Error('Book Instance not found');
            err.status = 404;
            return next(err);
        }
        
        res.render('bookinstance_detail', { title: 'Book', bookinstance: bookinstance });
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {       

    Book.find({},'title')
    .exec(function (err, books) {
      if (err) { return next(err); }
      // Successful, so render.
      res.render('bookinstance_form', {title: 'Create BookInstance', book_list:books});
    });
    
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
    // Convert data string format non iso "dd/mm/yy" to iso format "yy-mm-dd".
    (req, res, next) => {
        
        if(req.body.due_back){
            var date = moment(req.body.due_back, 'DD/MM/YYYY', true);
            
            if(date.isValid()) {
                req.body.due_back = moment(date).format('YYYY-MM-DD');
            }
        }
        next();
    },
    // Validate fields.
    body('book', 'Book must be specified').isLength({ min: 1 }).trim(),
    body('imprint', 'Imprint must be specified').isLength({ min: 1 }).trim(),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),
    
    // Sanitize fields.
    sanitizeBody('book').trim().escape(),
    sanitizeBody('imprint').trim().escape(),
    sanitizeBody('status').trim().escape(),
    //sanitizeBody('due_back').toDate(),
    
    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a BookInstance object with escaped and trimmed data.
        var bookinstance = new BookInstance(
          { book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values and error messages.
            Book.find({},'title')
                .exec(function (err, books) {
                    if (err) { return next(err); }
                    // Convert data string iso format "yy-mm-dd" to format non iso "dd/mm/yy"
                    if(req.body.due_back){
                        var date = moment(req.body.due_back, 'YYYY-MM-DD', true);
                        var due_back_f = '';
                        if(date.isValid()) {
                            req.body.due_back = moment(date).format('DD/MM/YYYY');
                            due_back_f =moment(date).format('DD/MM/YYYY'); 
                        } else {
                            due_back_f = req.body.due_back;
                        }
                    }
                    // Successful, so render.
                    res.render('bookinstance_form', { title: 'Create BookInstance', book_list : books, due_back_f : due_back_f, selected_book : bookinstance.book._id , errors: errors.array(), bookinstance:bookinstance });
            });
            return;
        }
        else {
            // Data from form is valid.
            bookinstance.save(function (err) {
                if (err) { return next(err); }
                   // Successful - redirect to new record.
                   res.redirect(bookinstance.url);
                });
        }
    }
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
//    res.send('NOT IMPLEMENTED: BookInstance delete GET');
    var id = mongoose.Types.ObjectId(req.params.id);
    BookInstance.findById(id)
    .populate('book')
    .exec(function (err, bookinstance) {
        if (err) { return next(err); }
        if(bookinstance == null) {
            res.redirect('/catalog/bookinstances');
        }
        
        res.render('bookinstance_delete', { title: 'Book', bookinstance: bookinstance });
    });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {
//    res.send('NOT IMPLEMENTED: BookInstance delete POST');
    
    BookInstance.findByIdAndRemove(req.body.bookinstanceid, function deleteAuthor(err) {
        if (err) { return next(err); }
        // Success - go to author list
        res.redirect('/catalog/bookinstances')
    });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res,next ) {
//    res.send('NOT IMPLEMENTED: BookInstance update GET');
    async.parallel({
        bookinstance: function(callback) {
            var id = mongoose.Types.ObjectId(req.params.id);
            BookInstance.findById(id).populate('book').exec(callback); 
        }, 
        book_list: function(callback) {
            Book.find({},'title').exec(callback);
        }
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.bookinstance==null) { // No results.
            var err = new Error('Book Instance not found');
            err.status = 404;
            return next(err);
        }
        if(results.bookinstance.due_back){
            
            var date = moment(results.bookinstance.due_back, 'YYYY-MM-DD', true);
            var due_back_f = '';
            if(date.isValid()) {
                results.bookinstance.due_back = moment(date).format('DD/MM/YYYY');
                due_back_f =moment(date).format('DD/MM/YYYY'); 
            }
            
            res.render('bookinstance_form', { title: 'Update Book Insatnce', due_back_f:due_back_f, book_list : results.book_list, selected_book : results.bookinstance.book._id , bookinstance:results.bookinstance });
        }
    });   
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post =  [
    // Convert data string format non iso "dd/mm/yy" to iso format "yy-mm-dd".
    (req, res, next) => {
        if(req.body.due_back){
            var date = moment(req.body.due_back, 'DD/MM/YYYY', true);
            
            if(date.isValid()) {
                req.body.due_back = moment(date).format('YYYY-MM-DD');
            }
        }
        next();
    },
     // Validate fields.
    body('book', 'Book must be specified').isLength({ min: 1 }).trim(),
    body('imprint', 'Imprint must be specified').isLength({ min: 1 }).trim(),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),
    
    // Sanitize fields.
    sanitizeBody('book').trim().escape(),
    sanitizeBody('imprint').trim().escape(),
    sanitizeBody('status').trim().escape(),
    //sanitizeBody('due_back').toDate(),
    
    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        // Create a BookInstance object with escaped and trimmed data.
        var bookinstance = new BookInstance(
          { book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back,
            _id:req.params.id //This is required, or a new ID will be assigned!
           });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values and error messages.
            Book.find({},'title')
                .exec(function (err, books) {
                    if (err) { return next(err); }
                    // Convert data string iso format "yy-mm-dd" to format non iso "dd/mm/yy"
                    if(req.body.due_back){
                        var date = moment(req.body.due_back, 'YYYY-MM-DD', true);
                        
                        var due_back_f = '';
                        if(date.isValid()) {
                            req.body.due_back = moment(date).format('DD/MM/YYYY');
                            due_back_f =moment(date).format('DD/MM/YYYY'); 
                        } else {
                            due_back_f = req.body.due_back;
                        }
                    }
                    // Successful, so render.
                    res.render('bookinstance_form', { title: 'Update BookInstance', book_list : books, due_back_f : due_back_f, selected_book : bookinstance.book._id , errors: errors.array(), bookinstance:bookinstance });
            });
            return;
        }
        else {
            // Data from form is valid. Update the record.
            BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function (err,theinstbook) {
                if (err) { return next(err); }
                   // Successful - redirect to book detail page.
                   res.redirect(theinstbook.url);
                });
        }
    }
];