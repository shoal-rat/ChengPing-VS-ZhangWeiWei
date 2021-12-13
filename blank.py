'''
import sys
import pygame
def run_game():
    pygame.init()
    screen=pygame.display.set_mode((1920,1080))
    pygame.display.set_caption("alien comes")
    while True:
        for event in pygame.event.get():
            if event.type==pygame.QUIT:
                sys.exit()
        pygame.display.flip()
run_game()
'''
import sys
import pygame
from pygame.sprite import Group
from setting import settings
import heroes
import game_functions as g_f
import blocks
#import bullet
def run_game():
    pygame.init()
    setting=settings()
    screen=pygame.display.set_mode((setting.width,setting.high))
    chenping=heroes.teacher_chen(screen)
    pygame.display.set_caption("CP VS ZWW")
    block=blocks.bolcks()
    #bulleting=bullet.bullets()
    #bullets=Group()
    while True:
        g_f.check_moving_event(chenping)
        chenping.update_place(setting.speed)
        #bulleting.update()
        g_f.update_screen(setting,screen,chenping)
        block.window(chenping,setting)
run_game()