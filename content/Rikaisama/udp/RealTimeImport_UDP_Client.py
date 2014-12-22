#!/usr/bin/env python2

import socket
import sys

HOST = "localhost"

port = int(sys.argv[1])
textMsg = sys.argv[2]

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.sendto(textMsg, (HOST, port))

#print "Port: " + str(port) + "  Message: " + textMsg
