function $(id) {
    return document.getElementById(id);
}

function QS({p = document, s} = {}) {
    return (p).querySelector(s);
}

function QSA({p = document, s} = {}) {
    return (p).querySelectorAll(s);
}

function CardTemplate() {
    return QS({ s: '.card.flipped' }).cloneNode(true);
}

function PlayerTemplate() {
    return QS({ s: '.player-position' }).cloneNode(true);
}

function applyStyles(styles, obj){
    styles.forEach(style => {
        const prop = Object.keys(style)[0];
        const value = style[prop];
        if (obj instanceof CardComponent){
            obj.template.style[prop] = value;
        }else{
            obj.style[prop] = value;
        }
    });
}

class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
        this.template = new CardTemplate();
        this.component = new CardComponent(this, this.template);
    }

    getValue() {
        if (['J', 'Q', 'K'].includes(this.rank)) {
            return 10;
        } else if (this.rank === 'A') {
            return 11;
        } else {
            return parseInt(this.rank, 10);
        }
    }

    getSuitColor() {
        return ['♥', '♦'].includes(this.suit) ? 'red' : 'black';
    }
}

class CardComponent {
    constructor(card, template) {
        this.card = card;
        this.template = template;
        this.#build();
        this.#addListeners();
    }

    #addListeners() {
        this.template.addEventListener('click', () => {
            this.flipCard(this.template);
        });
    }

    #build() {
        const data = `${this.card.rank} ${this.card.suit}`;
        ['front--card1','front--card-value','front--card2'].forEach(selector => {
            const template = QS({ p: this.template, s: `.${selector}` });
                  template.textContent = data;
                  applyStyles([{ 'color' : this.card.getSuitColor() }], template);
        });
        
        return this.template;
    }

    flipCard() {
        const c = this.template.classList;
        (!c.contains('flipped')) ? c.add('flipped')
            : c.remove('flipped');
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.#buildDeck();
    }

    #buildDeck() {
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const suits = ['♥', '♦', '♣', '♠'];
        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push(new Card(rank, suit));
            }
        }
        this.shuffle();
    }

    #createUniqueSeed() {
        const n = [2, 3, 7, 11, 13, 17, 23, 29, 31].sort(() => Math.random() - 0.5);
        return n[0];
    }

    shuffle() {
        const seed = this.#createUniqueSeed();

        // Shuffle the deck using Fisher-Yates algorithm with seed as an offset
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1 + seed)) % this.cards.length;
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    isLastCard() {
        return (this.cards.length <= 1);
    }

    hasCardsRemaining() {
        return (this.cards.length > 0);
    }

    getCardsRemaining() {
        return this.cards;
    }

    draw() {
        if (!this.isLastCard()) {
            if (this.hasCardsRemaining()) {
                return this.cards.shift();
            }
        }
    }
}


class BlackJack {
    constructor(app) {
        this.deck = new Deck();
        this.players = [];
        this.app = app;
        this.playerActions = [];

        this.addPlayer('House', true);
        this.addPlayer('Adam', true);
        this.addPlayer('Me', false);
    }

    addPlayer(playerName, isAI) {
        this.players.push(
            new Player(playerName, isAI, this.app)
        );
    }

    getActivePlayer() {
        const player = this.players.find(player => player.isActive === true);
        return player;
    }

    nextPlayer() {
        let curr = this.getActivePlayer();
        let currIndex = this.players.indexOf(curr);

        let nextIndex = (currIndex - 1 + this.players.length) % this.players.length;
        let next = this.players[nextIndex];

        curr.deactivate();
        next.activate();
    }

    deal() {
        return this.deck.draw();
    }

    determineWinner() {
        console.log('Determining the winner...');
    
        // Filter out players who have busted
        const eligiblePlayers = this.players.filter(player => player.isEligible);
    
        // Find the player with blackjack (2 cards totaling 21)
        const playerWithBlackjack = eligiblePlayers.find(player => player.hasBlackJack);
    
        if (playerWithBlackjack) {
            // Compare the remaining players' totals
            const remainingPlayers = eligiblePlayers.filter(player => player !== playerWithBlackjack);
            if (remainingPlayers.length > 0) {
                const winner = this.findPlayerWithHighestTotal(remainingPlayers);
                console.log(`Player ${winner.name} wins with a Blackjack!`);
                return;
            }
        }
    
        // Find the player(s) with a total of 21
        const playersWith21 = eligiblePlayers.filter(player => player.total() === 21);
    
        if (playersWith21.length > 0) {
            // Compare the remaining players' totals
            const remainingPlayers = eligiblePlayers.filter(player => !playersWith21.includes(player));
            if (remainingPlayers.length > 0) {
                const winner = this.findPlayerWithHighestTotal(remainingPlayers);
                console.log(`Player ${winner.name} wins with a total of 21!`);
                return;
            }
        }
    
        // No player with a total of 21, compare the totals directly
        if (eligiblePlayers.length > 0) {
            const winner = this.findPlayerWithHighestTotal(eligiblePlayers);
            console.log(`Player ${winner.name} wins with the highest total!`);
        }
    }
    
    findPlayerWithHighestTotal(players) {
        // Find the player with the highest total
        let highestTotalPlayer = players[0];
    
        for (let i = 1; i < players.length; i++) {
            if (players[i].total() > highestTotalPlayer.total()) {
                highestTotalPlayer = players[i];
            }
        }
        return highestTotalPlayer;
    }
}

class App {
    constructor(blackjack) {
        this.blackjack = new blackjack(this);
        this.isActive = null;
        this.round = 0;

        this.init();
    }

    init() {
        const card_template = QS({ s: '.card.flipped' });
        if (card_template instanceof HTMLElement) {
            card_template.classList.add('hide-it');
        }

        const player_template = QS({ s: '.player-position .placeholder' });
        if (player_template instanceof HTMLElement){
            if (player_template.id) return;
            player_template.classList.add('hide-it');
        }
        this.renderDeck();
        this.renderPlayers();
        this.isActive = true;
        this.initRound();
    }

    initRound() {
        this.round++

        console.log(`Round ${this.round} has started!`);
        const lastPlayerIndex = this.blackjack.players.length - 1;
        if (lastPlayerIndex >= 0) {
            this.blackjack.players[lastPlayerIndex].activate();
        }
    }
    
    nextRound() {
        if (!this.isActive) {
            console.log('Game not active!');
            return;
        }
        this.blackjack.players.forEach(player => { 
            player.clearCards();
        });
        console.log('Next round');
    }

    renderPlayers() {
        const table = $('game-table');
    
        this.blackjack.players.forEach((player, index) => {
            player.template.id = player.name;
            player.template.style.margin = "10px";
            const h3PlayerName = QS({ p: player.template, s: 'h3'});
                  h3PlayerName.textContent = player.name;
                  h3PlayerName.id = `h3${player.name}`;
                  h3PlayerName.appendChild(document.createElement('span'));
    
            if (index > 0) {
                const previousPlayerTemplate = this.blackjack.players[index - 1].template;
                table.insertBefore(player.template, previousPlayerTemplate.nextSibling);
            } else {
                table.appendChild(player.template);
            }
        });
    }    

    renderDeck() {
        this.blackjack.deck.cards.forEach(card => {
            const styles = [
                { 'position': 'absolute' },
                { 'top': '4px' },
                { 'left': '4px' }
            ];

            applyStyles(styles, card.component.template);
    
            QS({ p: $('game-deck'),
                 s: '.placeholder' }).appendChild(card.component.template);
        });
    }

    renderDeal() {
        const player = this.blackjack.getActivePlayer();
        const card = this.blackjack.deal();
            if (player.isAI) {
                player.hit(card);
            }else{
                player.hit(card);
            }
            QS({ p: $(player.name),
                 s: '.placeholder' }).appendChild(card.component.template);

            const timeoutId = setTimeout(() => {
                card.component.flipCard();
                this.updatePlayerTotal(player);
            }, 500);
        
            const animationEndHandler = function() {
                clearTimeout(timeoutId);
                card.component.template.removeEventListener('animationend', animationEndHandler);
            };
            card.component.template.addEventListener('animationend', animationEndHandler);
    }

    updatePlayerTotal(player) {
        QS({ p: $(`h3${player.name}`),
             s: 'span' }).textContent = ' ' + player.total();
    }
    
}

class Player {
    constructor(playerName, isAI, app) {
        this.isAI = isAI;
        this.AI_delayID = null;
        this.app = app;
        this.name = playerName;
        this.cards = [];
        this.template = new PlayerTemplate();
        this.isActive = false;
        this.hasBusted = false;
        this.hasStood = false;
        this.hasBlackJack = false;
        this.isEligible = true;
    }

    activate() {
        this.isActive = true;
        this.turn();
    }

    turn() {

        const shouldHit = (this.total() < 21) && (this.calcBustProbability() < 0.5);

        if (this.isAI) { this.AI_delayID = setTimeout(() => {

            if (this.name === 'House' && this.total() === 17) {
                this.stand();
            }

            if (this.total() === 21) {
                this.has21();
            }

            if (this.total() < 21 && shouldHit) {
                this.app.renderDeal();

            } else if (this.total() > 21){
                this.bust();

            }else{
                console.log(this.name + ' elected to STAND');
                this.stand();
            }

        }, 1000);
    
        } else {

            if (this.cards.length === 2 && this.total() === 21) {
                this.hasBlackJack = true;
                this.stand();

            } else if (this.total() === 21) {
                this.has21();

            } else if (this.total() > 21) {
                this.bust();
            }
        }
    }
    
    

    calcBustProbability() {
        const numCardsRemain = this.app.blackjack.deck.getCardsRemaining();
        const currTotal = this.total();
        let bustCount = 0;

        for (let card of numCardsRemain) {
            const newTotal = currTotal + card.getValue();
            if (newTotal > 21) { bustCount++; }
        }
        const probability = bustCount / numCardsRemain.length;
        return probability;
    }

    bust() {
        console.log(this.name + ' BUSTED');
        this.hasBusted = true;
        this.isEligible = false;
        if (this.isAI) {
            clearTimeout(this.AI_delayID);
        }
        this.app.blackjack.nextPlayer();
    }

    stand() {
        console.log(this.name + ' STOOD');
        this.hasStood = true;
        this.hasBusted = false;
        this.isEligible = false;
        if (this.isAI) {
            clearTimeout(this.AI_delayID);
        }
        this.app.blackjack.nextPlayer();
    }

    has21() {
        console.log(this.name + ' has 21');
        this.hasStood = true;
        if (this.isAI) {
            this.app.blackjack.nextPlayer();
            clearTimeout(this.AI_delayID);
        }
    }

    deactivate() {
        this.isActive = false;
    }

    hit(card) {
        this.cards.push(card);
        this.renderCard();
        if (this.isAI) {
            this.app.blackjack.nextPlayer();
            clearTimeout(this.AI_delayID);
        }
    }

    total() {
        let sum = 0;
        this.cards.forEach(card => {
            sum += card.getValue();
        });
        const adjTotal = this.adjustForAces(sum);

        return adjTotal;
    }

    adjustForAces(sum) {
        let numAces = 0;
        for (const card of this.cards) {
            if (card.rank === 'A') {
                numAces++;
            }
        }
    
        while (numAces > 0 && sum > 21) {
            if (this.name === 'House' && numAces === 1) {
                break;
            }
            sum -= 10;
            numAces--;
        }
        return sum;
    }

    renderCard() {
        this.cards.forEach((card, index) => {
            const offset = index * 20;

            const styles = [
                { 'position': 'absolute' },
                { 'top': '4px' },
                { 'left': `${(offset + 4)}px` },  /* +4 for visual... assuming border width */
                { 'z-index': 1 }
            ];

            card.component.template.classList.add('card-transition');
            applyStyles(styles, card.component.template);
        });
    }

    clearCards() {
        this.cards.length = 0;
        const placeholderCards = QSA({ p: $(this.name), s: '.placeholder .card' });
        placeholderCards.forEach(card => card.remove() );
    }
}


document.addEventListener('DOMContentLoaded', function () {

    const app = new App(BlackJack);

    $('btnHit').addEventListener('click', function () {

        if (!app.blackjack.deck.hasCardsRemaining()) {
            $('btnHit').disabled = true;
        } else {
            const activePlayer = app.blackjack.getActivePlayer();
            if (!activePlayer.hasBusted) {
                app.renderDeal();
                app.blackjack.nextPlayer();
            }
        }
    });

    $('btnStand').addEventListener('click', function () {
        const player = app.blackjack.getActivePlayer();
        console.log(`${player.name} has chosen to STAND`);
        app.blackjack.nextPlayer();
    });

    $('game-table').addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });
});