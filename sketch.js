let frameD = 5; //frame delay
let game; //future game object
let timer = 90;
let joyY = 0; sw = 0; //joystick inputs
let port;
let backgroundImage;
const startX = 50, startY = 300, enemyStartX = 725;
const canvasWidth = 800, canvasHeight = 600;
let connectButton;
let player;
let enemy;
let missile;
let birdSheet;
function setup() 
{
  port = createSerial();
  createCanvas(canvasWidth, canvasHeight);
  
  connectButton = createButton("Connect");
  connectButton.mousePressed(connect);
  game = new Game(player, enemy, missile);
  frameRate(60);
}

function connect() {
  if (!port.opened()) {
    port.open('Arduino', 57600);
  } else {
    port.close();
  }
}

function preload()
{
  backgroundImage = loadImage('assets/fieldBackground.jpg');
  birdSheet = loadImage('assets/Bird.png');
  player = new Player(startX, startY);
  enemy = new EnemyPlane(enemyStartX, startY);
  missile = new Missile();
  Tone.Buffer.load(['assets/blast.mp3']);
}

function draw() 
{
    background(backgroundImage);
    game.update();
}

function keyPressed()
{
  game.keyPressed();
}

class Game
{
  static States = {
    Start: 0,
    Play: 1,
    GameOver: 2
  }

  constructor(player, enemy, missile, state = Game.States.Start)
  {
    this.player = player;
    this.enemy = enemy;
    this.missile = missile;
    this.birds = [];
    this.totalTime = 0;
    this.startTime = Date.now();
    this.currentFrame = 0;
    this.enemySpawned = false;
    this.missileLoaded = true;

    this.setState(state);
  }

  //depending on the current state of the game, this will determine whether pre game, mid game, or post game
  setState(newState)
  {
    if(this.currentState != newState)
      {
        switch(newState)
        {
          case Game.States.Play:
          this.reset();
          break;
        case Game.States.GameOver: 
          this.gameOver();
          break;
        case Game.States.Start:
          this.start();
          break;
        }
        this.currentState = newState;
      }
  }

  //finish this method
  update()
  {
    switch(this.currentState) 
    {
      case Game.States.Play:
        let str = port.readUntil("\n");
        let values = str.split(",");
        if(values.length > 1)
          {
            joyY = Number(values[0]);
            sw = Number(values[1]);
          }
        this.player.joystick(joyY);
        this.missile.mUpdate(sw, this.player.sprite.x, this.player.sprite.y);
        this.enemy.eUpdate();
        for(const b of this.birds)
          {
            b.move();
            if(this.player.sprite.collides(b.sprite) && !b.collided)
              {
                this.player.lives--;
                b.sprite.removeColliders();
              }
            if(this.missile.sprite.collides(b.sprite))
              {
                b.sprite.remove();
                this.missile.sprite.x = canvasWidth+100;
              }
          }

        if(this.missile.sprite.collides(this.enemy.sprite))
        {
          this.enemy.sprite.removeColliders();
          this.missile.sprite.y -= 1000;
          this.missile.sprite.x-=1000;
          this.enemy.lives --;
          this.enemy.remakeColliders();
          this.enemy.sprite.rotation = 0;
        }

        if(this.player.lives == 0 || this.enemy.lives == 0)
          {
            this.setState(Game.States.GameOver);
          }

        if(this.missile.reloadingTime > 0)
          {
            text(`Reloading Time: ${this.missile.reloadingTime}`, 20, 90);
          }

        if(this.currentFrame % 60 == 0)
          {
            if(this.missile.reloadingTime > 0)
              {
                this.missile.reloadingTime --;
              }
          }

        if(this.missile.reloadingTime == 0 && this.missile.currentState == Missile.States.Reloading)
          {
            this.missile.mSetState(Missile.States.Loaded);
          }

        if(this.currentFrame % 90 == 0)
          {
            let bird = new Bird();
            this.birds.push(bird);
          }

        if(this.missile.currentState == Missile.States.Shot)
          {
            this.missile.mSetState(Missile.States.Reloading);
          }

        switch(this.player.lives)
        {
          case 2:
            port.write(`f`);
            break;
          case 1:
            port.write(`d`);
            break;
          case 0:
            port.write(`b`);
            break;
          default:
            break;
        }

        switch(this.enemy.lives)
        {
          case 2:
            port.write(`6`);
            break;
          case 1: 
            port.write(`4`);
            break;
          case 0:
            port.write(`2`);
            break;
          default:
            break;
        }

        let msTime = Date.now() - this.startTime;
        this.totalTime = Math.floor(msTime / 1000);
        textSize(30);
        fill('black');
        text(`Time: ${this.totalTime}`, 20, 40);
        text(`Player Health: ${this.player.lives}`, 20 ,65);

        this.currentFrame++;
        break;
      default:
        break;
    }
  }

  // displays some text before the game starts
  start()
  {
    this.gameStartBackground = new Sprite(width/2, height/2, width, height, 's');
    this.gameStartBackground.opacity = 0.75;
    this.gameStartBackground.color = "#fff";
    this.gameStartBackground.strokeWeight = 0;
    this.gameStartText = new Sprite(width/2, height/2, 0, 0, 's');
    this.gameStartText.d = 0;
    this.gameStartText.textSize = 32;
    this.gameStartText.text = "Press Space to Start";
  }

  //displays text when game ends
  gameOver() 
  {
    this.gameOverBackground = new Sprite(width/2, height/2, width, height, 's');
    this.gameOverBackground.opacity = 0.75;
    this.gameOverBackground.color = "#faaba5";
    this.gameOverBackground.strokeWeight = 0;
    this.gameOverText = new Sprite(width/2, height/2, 0, 0, 's');
    this.gameOverText.d = 0;
    this.gameOverText.textSize = 32;
    if(this.player.lives == 0)
      this.gameOverText.text = `Game Over\nTime: ${this.totalTime}, Press Space to Restart`;
    else
      this.gameOverText.text = `You Win\nTime ${this.totalTime}, Press Space to Restart`;
  }

  keyPressed()
  {
    switch(this.currentState)
    {
      case Game.States.GameOver:
      case Game.States.Start:
        if(keyCode == 32)
          {
            this.setState(Game.States.Play);
          }
          break;
        default:
          break;
    }
  }

  reset()
  {
    if(this.gameOverText)
      {
        this.gameOverText.remove();
        this.gameOverBackground.remove();
      }
    
      if(this.gameStartText)
      {
        this.gameStartText.remove();
        this.gameStartBackground.remove();
      }

      this.currentFrame = 0;
      this.player.setState(Player.States.Revive);
      this.enemy.eSetState(EnemyPlane.States.Revive);
      this.enemy.sprite.rotation = 0;
      for(const b of this.birds)
        {
          b.sprite.remove();
        }
      this.totalTime = 0;
      this.startTime = Date.now();
      port.write(`1`);
      port.write(`3`);
      port.write(`5`);
      port.write(`a`);
      port.write(`c`);
      port.write(`e`);
  }
}

class Player{
  
  static States = {
    FlyUp: 0,
    FlyDown: 1,
    Dead: 2,
    Revive: 3,
    Still: 4,
  }

  constructor(x, y)
  {
    this.sprite = new Sprite(x, y, 75, 75);
    this.sprite.spriteSheet = 'assets/ProPlane.png'
    this.sprite.frameDelay = frameD;
    this.sprite.addAnis({
      fly: {row: 0, col: 0, frames: 5},
      destroyed: {row: 0, col: 5, frames: 1},
      still: {row: 0, col: 0, frames: 1}
    });
    this.lives = 0;
    

    this.currentState = this.previousState = Player.States.Still;
    this.sprite.changeAni('still');
    this.currentAni = 3;
    
  }

  revive()
  {
    this.sprite.x = startX;
    this.sprite.y = startY;
    this.setState(Player.States.Still);
    this.lives = 3;
  }

  fly()
  {
    switch(this.currentAni)
    {
        case 0:
          break;
        default:
              this.sprite.removeColliders();
              this.sprite.addCollider(6,-3,22,73);
              this.sprite.addCollider(0,-2,70,20);
              this.sprite.addCollider(-26,0,13,50);
              this.sprite.collider = 'kinematic';
              this.sprite.changeAni('fly');
              this.currentAni = 0;
            break;
    }
  }

  dead()
  {
    this.sprite.removeColliders();
    this.sprite.changeAni('destroyed');
    this.currentAni = 1;
  }

  flyUp()
  {
    if(this.sprite.y - 75/2 > 0)
      {
        this.sprite.y-=5;
      }
  }

  flyDown()
  {
    if(this.sprite.y + 75/2 < canvasHeight)
      {
        this.sprite.y+=5;
      }
  }

  setState(newState)
  {
    if(this.currentState != newState)
      {
        this.previousState = this.currentState;
        this.currentState = newState;
        switch(newState)
        {
          case Player.States.FlyUp:
            this.fly();
            this.flyUp();
            break;
          case Player.States.FlyDown:
            this.fly();
            this.flyDown();
            break;
          case Player.States.Dead:
            this.dead();
            break;
          case Player.States.Revive:
            this.revive();
            break;
          case Player.States.Still:
            this.fly();
            break;
        }
      }
      else
      {
        switch(this.currentState)
        {
          case Player.States.FlyDown:
            this.fly();
            this.flyDown();
            break;
          case Player.States.FlyUp:
            this.fly();
            this.flyUp();
            break;
          default:
            break;
        }
      }
  }

  joystick(jY)
  {
    switch(this.currentState)
    {
      case Player.States.FlyUp:
      case Player.States.FlyDown:
      case Player.States.Still:
        if (jY > 50) 
        {
          this.setState(Player.States.FlyDown);
        } 
        else if (jY < -50) 
        {
          this.setState(Player.States.FlyUp);
        } 
        else 
        {
          this.setState(Player.States.Still);
        }
        break;
      default:
        break;
    }
  }
}

class EnemyPlane
{
  static States = 
  {
    FlyUp: 0,
    FlyDown: 1,
    Destroyed: 2, 
    Revive: 3,
    Still: 4
  }
  constructor(x, y)
  {
    this.sprite = new Sprite(x, y, 75, 75);
    this.sprite.spriteSheet = 'assets/EnemyPlane.png';
    this.sprite.frameDelay = frameD;
    this.sprite.addAnis({
      fly: {row: 0, col: 0, frames: 5},
      destroyed: {row: 0, col: 5, frames: 1},
      still: {row: 0, col: 0, frames: 1}
    });
    
    this.lives = 0;
    this.alive = true;
    this.currentState = this.previousState = EnemyPlane.States.Still;
    this.sprite.changeAni('still');
    this.currentAni = 2;
  }

  eSetState(newState)
  {
    if(this.currentState != newState)
      {
        this.previousState = this.currentState;
        this.currentState = newState;
        switch(newState)
        {
          case EnemyPlane.States.FlyUp:
            this.eFly();
            this.eFlyUp();
            break;
          case EnemyPlane.States.FlyDown:
            this.eFly();
            this.eFlyDown();
            break;
          case EnemyPlane.States.Destroyed:
            this.eDead();
            break;
          case EnemyPlane.States.Still:
            this.eFly();
            break;
          case EnemyPlane.States.Revive:
            this.eRevive();
            break;
          default:
            break;
        }
      }
      else
      {
        switch (newState)
        {
          case EnemyPlane.States.FlyDown:
              this.eFly();
              this.eFlyDown();
              break;
          case EnemyPlane.States.FlyUp:
              this.eFly();
              this.eFlyUp();
              break;
          default:
              break;
        }
      }
  }
  eFlyUp()
  {
    if(this.sprite.y + 75/4 > 0)
      {
        this.sprite.y-=2;
      }
  }

  eFlyDown()
  {
    if(this.sprite.y - 75/4 < canvasHeight)
      {
        this.sprite.y+=2;
      }
  }

  eFly()
  {
    switch(this.currentAni)
    {
        case 0:
          break;
        default:
            this.sprite.removeColliders();
            this.remakeColliders();
            this.sprite.changeAni('fly');
            this.currentAni = 0;
            break;
    }
  }

  remakeColliders()
  {
    this.sprite.addCollider(0,0,70,25);
    this.sprite.addCollider(7,25,20,20);
    this.sprite.addCollider(7,-25,20,20);
    this.sprite.collider = 'dynamic';
  }
  eDead()
  {
    this.sprite.removeColliders();
    this.sprite.changeAni('destroyed');
    this.currentAni = 1;
  }

  eRevive()
  {
    this.sprite.x = enemyStartX;
    this.sprite.y = startY;
    this.eSetState(EnemyPlane.States.Still);
    this.lives = 3;
  }

  eUpdate()
  {
    switch(this.currentState)
    {
      case EnemyPlane.States.Revive:
        this.eSetState(EnemyPlane.States.FlyDown);
        break;
      case EnemyPlane.States.Still:
        this.eSetState(EnemyPlane.States.FlyDown);
        break;
      case EnemyPlane.States.FlyUp:
        if(this.sprite.y - 75/2 <= 0)
        {
          this.eSetState(EnemyPlane.States.FlyDown);
        }
        else
        {
          this.eSetState(EnemyPlane.States.FlyUp);
        }
        break;
      case EnemyPlane.States.FlyDown:
        if(this.sprite.y + 75/2 >= canvasHeight)
        {
          this.eSetState(EnemyPlane.States.FlyUp);
        }
        else
          {
            this.eSetState(EnemyPlane.States.FlyDown);   
          }
        break;
      default:
        break;
    }
  }
}

class Missile
{
  static States =
  {
    Loaded: 0,
    Shot: 1,
    Reloading: 2
  }

  constructor()
  {
    this.sprite = new Sprite(canvasWidth + 100, canvasHeight + 100, 40, 40);
    this.sprite.spriteSheet = 'assets/Missile.png';
    this.sprite.addAnis(
      {
        fly: {row: 0, frames: 1}
      }
    );
    this.sprite.changeAni('fly');
    this.sprite.addCollider();
    this.sprite.collider = 'kinematic';
    this.sprite.reloadingTime = 0;

    this.currentState = this.previousState = Missile.States.Loaded;
  }

  shoot(x, y)
  {
    this.sprite.x = x + 20;
    this.sprite.y = y;
  }
  travel()
  {
    this.sprite.x += 10;
  }

  reload()
  {
    this.reloadingTime = 3;
  }

  load()
  {
    this.sprite.x = canvasWidth + 100;
    this.sprite.y = canvasHeight + 100; 
  }

  mSetState(newState, x = null, y = null)
  {
    if(this.currentState != newState)
      {
        this.previousState = this.currentState;
        this.currentState = newState;
        switch(newState)
        {
          case Missile.States.Reloading:
            this.reload();
            break;
          case Missile.States.Shot:
            this.shoot(x, y);
            break;
          case Missile.States.Load:
            this.load();
            break;
        }
      }

      else
      {
        switch(newState)
        {
          case Missile.States.Reloading:
            this.travel();
            break;
          case Missile.States.Shot:
            this.travel();
            break;
          default:
            break;
        }
      }
  }

  mUpdate(sw, x, y)
  {
    if(sw == 1)
      {
        if(this.currentState == Missile.States.Loaded)
          this.mSetState(Missile.States.Shot, x, y);
      }
    if (this.currentState == Missile.States.Shot)
        this.mSetState(Missile.States.Shot, x, y);
    else if (this.currentState == Missile.States.Reloading)
      this.mSetState(Missile.States.Reloading);
  }
}

class Bird{
  constructor()
  {
    let yPositions = [50,100,150,200,250,300,350,400,450,500,550];
    let intitialX = canvasWidth - 175;
    this.sprite = new Sprite(intitialX, getRandomElement(yPositions), 50, 50);
    this.sprite.spriteSheet = birdSheet;
    this.sprite.addAnis({
      fly: {row: 0, col: 0, frames: 2}
    })
    this.sprite.frameDelay = frameD;
    this.sprite.removeColliders();
    this.sprite.addCollider(13,-13,30,30);
    this.sprite.addCollider(-12,12,32,34);
    this.sprite.collider = 'dynamic';
    this.sprite.changeAni('fly');
    this.collided = false;
  }

  move()
  {
    this.sprite.x -= 5;
  }
}

function getRandomElement(arr)
{
  let randIndex = Math.floor(Math.random() * arr.length);
  return arr[randIndex];
}