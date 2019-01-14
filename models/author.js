var mongoose = require('mongoose');
var moment = require('moment');

var Schema = mongoose.Schema;

var AuthorSchema = new Schema(
  {
    first_name: {type: String, required: true, max: 100},
    family_name: {type: String, required: true, max: 100},
    date_of_birth: {type: Date},
    date_of_death: {type: Date},
  }
);

// Virtual for author's full name
AuthorSchema
.virtual('name')
.get(function () {
  return this.family_name + ' ' + this.first_name;
});

// Virtual for author's lifespan
AuthorSchema
.virtual('lifespan')
.get(function () {
  return (this.date_of_death.getYear() - this.date_of_birth.getYear()).toString();
});

AuthorSchema
.virtual('living_dates')
.get(function () {
    var str_living_dates =' - ';
    if(this.date_of_birth) {
        str_living_dates = moment(this.date_of_birth).format('Do MMMM YYYY');
    }
    if(this.date_of_death) {
        str_living_dates = str_living_dates + ' - '+moment(this.date_of_death).format('Do MMMM YYYY');
    }
  return str_living_dates;
});

// Virtual for author's URL
AuthorSchema
.virtual('url')
.get(function () {
  return '/catalog/author/' + this._id;
});

//Export model
module.exports = mongoose.model('Author', AuthorSchema);