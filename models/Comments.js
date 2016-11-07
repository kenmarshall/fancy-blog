var mongoose = require('mongoose');

var CommentSchema = new mongoose.Schema({
	author : String,
	body : String,
	upvotes : { type: Number, default:0},
	post: {type: mongoose.Schema.Types.ObjectId, ref:'Post'}
});

CommentSchema.methods.upvote = function(cb){
	this.upvotes++;
	this.save(cb);
}

CommentSchema.methods.downvote = function(cb) {
	if(this.upvote > 0){
		this.upvotes--;
		this.save(cb);
	}
}

mongoose.model('Comment', CommentSchema);