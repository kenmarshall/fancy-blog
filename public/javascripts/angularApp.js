var app = angular.module('flappyNews' , ['ui.router']);

app.config([
    '$stateProvider',
    '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider){
        $stateProvider.state('home', {
            url: '/home',
            templateUrl: '/home.html',
            controller: 'MainCtrl',
            resolve: {
                postPromise : ['posts', function(posts){
                    posts.getAll();
                }]
            }
        })
        .state('posts',{
    		url: '/posts/{id}',
    		templateUrl: '/posts.html',
    		controller: 'PostsCtrl',
            resolve: {
                post : ['$stateParams', 'posts', function($stateParams, posts){
                    return posts.get($stateParams.id);
                }]
            }
        })
        .state('login',{
            url: '/login',
            templateUrl: '/login.html',
            controller: 'AuthCtrl',
            onEnter: ['$state', 'auth', function($state, auth){
                if(auth.isLoggedIn()){
                    $state.go('home');
                }
            }]
        })
        .state('register', {
            url: '/register',
            templateUrl: '/register.html',
            controller: 'AuthCtrl',
            onEnter: ['$state', 'auth', function ($state, auth) {
                if(auth.isLoggedIn()){
                    $state.go('home');
                }
            }] 
        });

        $urlRouterProvider.otherwise('home');
    }
         
]);

app.controller('MainCtrl', ['$scope','posts', 'auth', function($scope, posts, auth){
    $scope.posts = posts.posts;
    $scope.isLoggedIn = auth.isLoggedIn;
	

    $scope.addPost = function(){
       posts.create({
            title: $scope.title,
            link: $scope.link            
        });

        $scope.link = '';
        $scope.title = '';
    }

    $scope.incrementUpvote = function(post){
        
        posts.upvote(post);
    }

    $scope.decrementUpvote = function(post){
        posts.downvote(post);
    }
}]);

app.controller('PostsCtrl', [
	'$scope',
	'posts', 
    'post',
    'auth',
	function($scope, posts, post, auth){
		$scope.post = post;
        $scope.isLoggedIn = auth.isLoggedIn;
       		
		$scope.addComment = function() {
				

			if($scope.body === '') { return;}
			posts.addComment(post.id, {
                author: 'user', 
                body: $scope.body
            }).success(function(comment){
                $scope.post.comments.push(comment);
            });

			$scope.body = '';
		}				
		
        $scope.incrementUpvote = function(comment){
			posts.upvoteComment(post, comment);
		}

        $scope.decrementUpvote = function(comment){            
            posts.downvoteComment(post, comment);            
        }
	}
]);

app.controller('AuthCtrl', ['$scope', '$state', 'auth',  function($scope, $state, auth){
    $scope.register = function(){
     
        auth.register($scope.user).error(function(error){
            $scope.error = error;
        }).then(function(){
            $state.go('home');
        });
    }

    $scope.logIn = function(){
        auth.logIn($scope.user).error(function(error){
            $scope.error = error;
        }).then(function(){
            $state.go('home');
        });
    }
}]);

app.controller('NavCtrl', ['$scope', 'auth', function($scope, auth){
    $scope.isLoggedIn = auth.isLoggedIn;
    $scope.currentUser = auth.currentUser;
    $scope.logOut = auth.logOut;
}])

app.factory('posts', ['$http', 'auth', function( $http, auth ) {
    var o = {
        posts: []
    };

    o.getAll = function(){
        $http.get('/posts').success(function(data){
            angular.copy(data, o.posts);
        });
    }

    o.get = function(id){
        return $http.get('/posts/' + id).then(function(res){
            return res.data;
        })
    }

    o.create = function(post){
       return $http.post('/posts', post, {
            headers: { Authorization: 'Bearer ' + auth.getToken() }
        }).success(function(data){
            o.posts.push(data);
        });
    }

    o.upvote = function(post){
       return $http.put('/posts/' + post._id + '/upvote', null, {
            headers: { Authorization: 'Bearer ' + auth.getToken() }
        }).success(function(data){
            post.upvotes++;
        });
    }

    o.downvote = function(post){
        console.log('downvote ', post);
      return $http.put('/posts/' + post._id + '/downvote', null, {
            headers: { Authorization: 'Bearer ' + auth.getToken() }
        }).success(function(data){
            if(post.upvotes > 0){
                post.upvotes--;
            }
        });
    }



    o.addComment = function(id, comment){
        return $http.post('/posts/'+ id + '/comments', null, {
            headers: { Authorization: 'Bearer ' + auth.getToken() }
        });
    }

    o.upvoteComment = function(post, comment){
        return $http.post('/posts/' + post._id + '/comments/' + comment._id, null, {
            headers: { Authorization: 'Bearer ' + auth.getToken() }
        }).success(function(data){
            comment.upvote++;
        });
    }

    o.downvoteComment = function(post, comment){
        return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/downvote', null, {
            headers: { Authorization: 'Bearer ' + auth.getToken() }
        }).success(function(data){
            if (comment.upvotes > 0){
                comment.upvotes--;
            }
        });
    }

    return o;

}]);



app.factory('auth', ['$http', '$window', function($http, $window){
    var auth = {};
    
    var extractPayload = function(token){
        var payload = JSON.parse($window.atob(token.split('.')[1]));
        return payload;
    }

    auth.saveToken = function(token){
      
        $window.localStorage['flappy-news-token'] = token;
    };

    auth.getToken = function(){
        return $window.localStorage['flappy-news-token'];
    };

    auth.isLoggedIn = function(){
        var token = auth.getToken();
        if (token) {
            
            var payload = extractPayload(token);

            return payload.exp > Date.now() / 1000;

        } else {
            return false;
        }

    };

    auth.currentUser = function(){
        if(auth.isLoggedIn()){
            var token = auth.getToken();
            var payload = extractPayload(token);

            return payload.username;
        }
    };

    auth.register = function(user){
       return $http.post('/register', user).success(function(data){
         
            auth.saveToken(data.token);
        });
    }

    auth.logIn = function(user){
       return $http.post('/login', user).success(function(data){
            auth.saveToken(data.token);
        });
    }

    auth.logOut = function(){
        $window.localStorage.removeItem('flappy-news-token');
    }

    return auth;
}]);
