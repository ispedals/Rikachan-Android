/*

Description:
  Send a text message via UDP to specified port on localhost.

Note: 
  Much of this code was taken from: 
  http://msdn.microsoft.com/en-us/library/ms740148 

*/

#ifndef UNICODE
  #define UNICODE
#endif

#define WIN32_LEAN_AND_MEAN

#include <winsock2.h>
#include <Ws2tcpip.h>
#include <shellapi.h>
#include <stdio.h>
#include <stdlib.h>

#pragma comment(lib, "Ws2_32.lib")


/* Print usage information */
void usage(int exit_code, char *msg)
{
  if(strlen(msg) > 0)
  {
    printf("%s\n", msg);
  }

  printf("usage: RealTimeImport_UDP_Client.exe [-ver] <PORT> <TEXT>\n");
  printf("       Send a TEXT message via UDP to specified PORT on localhost.\n");
  printf(" -ver: Print the version information.\n");

  exit(exit_code);

} /* usage */


/* len includes null terminator */
void strncpy_len(char *dst, char *src, int len)
{
  dst[0] = '\0';
  strncat(dst, src, len);

} /* strncpy_len */


int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
  #define TEXT_LEN 1024

  int i;
  int argc = 0;
  LPWSTR *argv;
  char cur_arg[TEXT_LEN] = "";
  int result;
  WSADATA wsa_data;
  SOCKET SendSocket = INVALID_SOCKET;
  SOCKADDR_IN recv_addr;
  struct hostent *hp;
  int port = 49600;
  char text_msg[TEXT_LEN] = "";

  memset(text_msg, 0, sizeof(text_msg));

  argv = CommandLineToArgvW(GetCommandLineW(), &argc);

  if(NULL == argv)
  {
    printf("Error: Could not determine arguments!\n");
    exit(1);
  }

  for(i = 1; i < argc; i++)
  {
    wcstombs(cur_arg, argv[i], TEXT_LEN); // Convert to char array

    if(strcmp(cur_arg, "-ver") == 0)
    {
      usage(0, "RealTimeImport_UDP_Client version 1.0 by Christopher Brochtrup.\n");
    }
    else
    {
      if(argc - i != 2)
      {
        usage(1, "Error: Incorrect number of arguments!\n");
      }

      port = atoi(cur_arg);

      i++;
      wcstombs(cur_arg, argv[i], TEXT_LEN);

      strncpy_len(text_msg, cur_arg, TEXT_LEN);
    }
  }

  LocalFree(argv);

  if(strlen(text_msg) == 0)
  {
    usage(1, "Error: No text message provided!\n");
  }

  result = WSAStartup(MAKEWORD(2, 2), &wsa_data);

  if(result != NO_ERROR)
  {
    printf("WSAStartup failed with error: %d\n", result);
    return 1;
  }

  SendSocket = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);

  if(SendSocket == INVALID_SOCKET)
  {
    printf("socket failed with error: %ld\n", WSAGetLastError());
    WSACleanup();
    return 1;
  }

  hp = gethostbyname("localhost");
  memset(&recv_addr, 0, sizeof(recv_addr));
  memcpy(&(recv_addr.sin_addr), hp->h_addr, hp->h_length);
  recv_addr.sin_family = AF_INET;
  recv_addr.sin_port = htons(port);

  result = sendto(SendSocket, text_msg, strlen(text_msg), 0, (SOCKADDR *)&recv_addr, sizeof(recv_addr));
  
  if(result == SOCKET_ERROR)
  {
    printf("sendto failed with error: %d\n", WSAGetLastError());
    closesocket(SendSocket);
    WSACleanup();
    return 1;
  }

  result = closesocket(SendSocket);

  if(result == SOCKET_ERROR)
  {
    printf("closesocket failed with error: %d\n", WSAGetLastError());
    WSACleanup();
    return 1;
  }

  WSACleanup();

  return 0;

} /* WinMain */
