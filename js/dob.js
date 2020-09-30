function calculate_age(dob) { 
    var diff_ms = Date.now() - dob.getTime();
    var age_dt = new Date(diff_ms); 
  
    return Math.abs(age_dt.getUTCFullYear() - 1970);
}


window.onload = function(){
    console.log(calculate_age(new Date(1996, 12, 10)));
    document.getElementById("age").innerText = calculate_age(new Date(1996, 12, 10));
}