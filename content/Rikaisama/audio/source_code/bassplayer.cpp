#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <conio.h>
#include "bass.h"


/* Display error messages */
void print_bass_error(const char *text)
{
  printf("Error(%d): %s\n", BASS_ErrorGetCode(), text);
  BASS_Free();
  exit(1);

} /* print_bass_error */


/* Print usage information */
void usage(int exit_code, char *msg)
{
  if(strlen(msg) > 0)
  {
    printf("%s\n", msg);
  }

  printf("usage: bassplayer-win [-ver] [-vol n] <file>\n");
  printf("  -ver: Print the version information.\n");
  printf("  -vol: Set the volume. Range [0-100]. Default: 100.\n");

  exit(exit_code);

} /* usage */


int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
  int i = 0;
  DWORD chan = 0;
  DWORD act = 0;
  DWORD volume = 100;
  wchar_t file[320] = L"";
  int argc = 0;
  LPWSTR *argv;
  int status = 0;

  /* Check the correct BASS was loaded */
  if(HIWORD(BASS_GetVersion()) != BASSVERSION)
  {
    usage(1, "Error: An incorrect version of BASS was loaded!");
  }

  argv = CommandLineToArgvW(GetCommandLineW(), &argc);

  if(NULL == argv)
  {
    printf("Error: Could not determine arguments!\n");
    exit(1);
  }

  if(argc > 4)
  {
    usage(1, "Error: Too many arguments!\n");
  }
  else
  {
    for (i = 1; i < argc; i++)
    {
      if (wcscmp(argv[i], L"-ver") == 0)
      {
        usage(0, "bassplayer-win version 2.3 by Christopher Brochtrup.\n");
      }
      else if(wcscmp(argv[i], L"-vol") == 0)
      {
        i++;
        volume = _wtoi(argv[i]);
      }
      else
      {
        wcsncpy(file, argv[i], 255);
      }
    }
  }

  LocalFree(argv);

  if(wcslen(file) == 0)
  {
    usage(1, "Error: No file provided!\n");
  }

  status = BASS_Init(-1, 44100, 0, 0, NULL);

  if(!status)
  {
    print_bass_error("BASS_Init()");
  }

  chan = BASS_StreamCreateFile(FALSE, file, 0, 0, BASS_UNICODE);

  if(!chan)
  {
    print_bass_error("BASS_StreamCreateFile()");
  }

  BASS_SetConfig(BASS_CONFIG_GVOL_STREAM, volume*100); /* Global stream volume (0-10000) */

  status = BASS_ChannelPlay(chan, FALSE);

  if(!status)
  {
    print_bass_error("BASS_ErrorGetCode()");
  }

  /* Wait for file to finish playing */
  while(act = BASS_ChannelIsActive(chan))
  {
    Sleep(50);
  }

  BASS_Free();

  exit(0);

} /* WinMain */
