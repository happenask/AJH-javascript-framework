(function() {
    window[ 'templateCache' ] = {};
    window[ 'templateCache' ][ 'inject.html' ] = '<h1>Page 1: <%greeting%></h1><p><%moreText %></p><button class="my-button">Click me</button>';
    window[ 'templateCache' ][ 'inject2.html' ] = '<h1>Page 2: <%heading%></h1><button class="my-button">Click me</button>';
    window[ 'templateCache' ][ 'inject3.html' ] = '<h1>Page 3: <%heading.head%></h1><p> <%heading.content%></p> <%for(var index in heading) {%> <h3><%heading[index]%></h3> <%}%>';
}());