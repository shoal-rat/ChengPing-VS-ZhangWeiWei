import sys
import pygame
#from bullet import bullets

from heroes import teacher_chen
def check_moving_event(teacher_chen):
    for event in pygame.event.get():
        if event.type==pygame.QUIT:
            sys.exit()
        elif event.type==pygame.KEYDOWN:
            if event.unicode=='w':
                if teacher_chen.rect[1]!=0:
                    teacher_chen.moving='up'
            if event.unicode=='s':
                if teacher_chen.rect[1]!=790:
                    teacher_chen.moving='down'
            if event.unicode=='a':
                if teacher_chen.rect[0]!=0:
                    teacher_chen.moving='left'
            if event.unicode=='d':
                if teacher_chen.rect[0]!=1190:
                    teacher_chen.moving='right'

#            if event.unicode=='':
#                bullets.draw_bullet()
        elif event.type==pygame.KEYUP:
            teacher_chen.moving='pause'
def update_screen(setting,screen,hero):
    screen.fill(setting.color)
    hero.blit()
#    bullet.bullets.update()
    pygame.display.flip()