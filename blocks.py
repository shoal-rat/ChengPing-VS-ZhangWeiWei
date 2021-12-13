import pygame
import sys
import heroes
class bolcks():
    def window(self,chenping,settings):
        if chenping.rect[0] not in range(1,settings.width-57):
            if chenping.moving=='left' or chenping.moving=='right':
                chenping.moving='pause'
        if chenping.rect[1] not in range(1,settings.high-76):
            if chenping.moving=='up' or chenping.moving=='down':
                chenping.moving='pause'