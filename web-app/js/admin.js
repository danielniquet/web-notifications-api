
var app = angular.module('home',[]);
app.controller('home', function ($scope) {

  var socket = io();
  var is_admin=jQuery('body').hasClass('admin'); 
  socket.emit('get subscriptions');
  socket.on('get subscriptions',function(data){
      $scope.user_show=data;
      $scope.$apply(); 
    }); 


  $('.btnSendMsg').on('click',function(ev){
    var clients=$('.clients input:checked');
    var ids=[];
    $.each(clients,function(i,el){
    	ids.push($(el).val())
    })
    $.ajax({
	  url: "/api/trigger-push-msg/"+$('.txtTitle').val()+"/"+$('.txtMsg').val(),
	  method: "post",
	  data: {ids:ids}
	}).done(function(data) {
	  console.log(data)
	});
  })

})

