import http.server
import socketserver

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        return super(CORSRequestHandler, self).end_headers()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    port = 8080
    handler = CORSRequestHandler
    httpd = socketserver.TCPServer(('', port), handler)
    print(f"Serving at port {port} with CORS enabled")
    httpd.serve_forever()
