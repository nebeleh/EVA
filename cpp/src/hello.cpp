#include<stdio.h>

class Test {}; // This will fail in C mode

int main() {
  printf("hello, world ASM!\n");
  return 1;
}

