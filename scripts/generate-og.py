from PIL import Image, ImageDraw, ImageFont

W,H=1200,630
BG=(8,17,12)
ACCENT=(99,217,149)
TEXT=(243,244,239)
MUTED=(184,196,188)
img=Image.new("RGB",(W,H),BG)
d=ImageDraw.Draw(img)

# understated green depth
for x,y,r,c in [
    (-120,-120,480,(18,55,31)),
    (1110,120,430,(12,45,26)),
]:
    d.ellipse((x-r,y-r,x+r,y+r),fill=c)

# geometric brand lines
d.arc((825,-120,1375,430),280,95,fill=ACCENT,width=3)
for i in range(5):
    y=465+i*28
    d.line((790,y,1240,y-130),fill=(39,112,67),width=2)

def font(size,bold=False):
    path="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(path,size)

# Hendry Commercial approved concept 1 mark
# Continuous green H/C ribbon — no background-coloured break through the crossbar
d.polygon([(70,115),(92,84),(118,72),(105,101),(100,111),(95,124),(93,139),(98,151),(109,159),(124,163),(139,163),(156,122),(146,128),(135,133),(126,134),(119,131),(115,124),(118,116),(130,105)],fill=ACCENT)
# Darker green fold remains visibly part of the mark rather than reading as a hole
d.ellipse((94,111,139,157),fill=(20,94,61))
d.polygon([(118,116),(130,105),(156,92),(150,107),(140,115),(133,124),(132,134),(139,139),(149,136),(143,151),(130,152),(120,147),(114,137),(113,126)],fill=(44,168,106))
# White forward blade
d.polygon([(139,163),(157,104),(189,88),(174,150),(164,157)],fill=TEXT)
# Divider and stacked wordmark
d.line((212,66,212,154),fill=(83,102,90),width=1)
d.text((234,77),"HENDRY",font=font(22,True),fill=TEXT)
d.text((234,105),"COMMERCIAL",font=font(14),fill=(229,233,230))

# right-hand operating words
for i,t in enumerate(["QUESTION","SIMPLIFY","BUILD","GROW"]):
    d.text((1010,76+i*29),t,font=font(14),fill=(154,174,161))

# core message
d.text((70,205),"Jonathan Hendry",font=font(70,True),fill=TEXT)
d.text((72,300),"Commercial Leader · Builder",font=font(31,True),fill=ACCENT)
d.text((72,382),"BUY  ·  SELL  ·  BUILD",font=font(25),fill=(215,223,217))
d.rectangle((72,503,136,506),fill=ACCENT)
d.text((72,526),"hendrycommercial.co.uk",font=font(21),fill=MUTED)

img.save("social-preview.png",optimize=True)
