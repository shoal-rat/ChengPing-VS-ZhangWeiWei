import pygame
from pygame import sprite
from pygame.sprite import Sprite
class bullets(sprite):
    def __init__(self,setting,screen,hero):
        super(bullets,self).__init__()
        self.screen=screen
        self.rect=[hero.rect[0],hero.rect[1]]
        self.x=float(self.rect[0])
        self.img=setting.settings.bullet_img
        self.speed=setting.settings.bullet_speed
    def update(self):
        self.x+=self.speed
        self.rect.x=self.x
    def draw_bullet(self):
        self.screen.blit(self.img,self.rect)