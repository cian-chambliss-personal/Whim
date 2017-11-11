# Whim

Agnostic AI and scripting for Gaming

Whim - noun :- an odd or capricious notion or desire; a sudden or freakish fancy.

Whim is a very sparse reprepresentation of game state that can express text adventures as well as logic for RPG adventures.

It uses some of the same syntax as genTile (which includes whim syntax), but does not require genTile.

# Design

Names are flat, resolved as variables in closures are resolved.  The closest 'closure' to the resolver will contain things like actions and time, while the farthest closure will be player state (and inventory).

The only specialization of names is that like genTile, the at sign (@) is used to denote locations, the hash sign '#" is used to denote the expanse type (i.e. #water means 'in water') , '!' denotes a feature (i.e. !road means on road).

The top level defines the 'actors' scripting (using an '@' so it overloads the compare against location / so avoid naming locations and actors by the same name).

The top level may include a schedule, i.e. conditions for location of actor are enclosed in square braces.

Format is condition test, prefixed with '=', a condition, then a '!' followed by the location.

The top level is most likely include conditions - which are denoted by the equals (=) character followed by the condition, followed by the action.

The action can be player initiated (these are bracketed with angle brackets going the 'direction' of the interaction , so starting with '>' ending with '\<' , the meaning being 'enter a state', and 'leave a state'

The action can also be actor initiated - these are unbracketed.

The '?' action denotes a conversation.

The '"' action denotes dialog (After a '?' its the actors line, otherwise the action is determined to the players if inside a player initiated conversion, or the actors if not).

The '-' and '+' prefix allow for items to be be exchanged '-' takes the item(s) from the players inventory, '+' adds the item(s) to the players inventory / state.   The '"' directly after these actions is used when the condition cannot be met (i.e. no inventory, missing pre-requiste).  When there is a squence of '+' and '-', the exchange action will only be applied if ALL the conditions can be satisfied.

Externally named actions have a '!' prefix (followed by a space / when included with the name, a '!' denotes a 'feature' element of a game).

Random selection is denoted not the '%' prefix (with the odds following the '%').

Scalars are denoted by a '\*' following a number - this indicates  the numnber of items (in a test, this is assumed to be  minimum) / this is used for exchanges of item(s) for bartering in a game.

Range testing of values is denoted by a ':' suffix, followed by optional number , followed by '>', followed by another optional number, of which there must be at least one number.  If a number is missing, the comparison is assumed unconstrained that direction.  If there are more than one range accepted, they will be separated with a logical or denoted by '||'.

Immediately after the closing '\<' brace there can be a name of a goto action.

Goto actions are prefixed with a '$' character, and can define loops.

The '...' character can be used inside gotos to show the ansers defined at the containing context. 

# Prototype

```
@weaponseller
    [
        = hour: 16 > 6 ! @home
        = hour: 6 > 12 || 13 > 16 ! @shop
        = hour: 12 > 13 ! @cafe
    ]
    = @shop
        > ?
            " What do you want to buy?
            = bow
                > " Arrows
                    - coin * 20
                        " Sorry, you don't have enough gold.
                    + arrow * 10
                        " Sorry, you don't have enough room in your quiver.
                    < again
            > " Sword
                - coin * 300
                    " Sorry, you don't have enough gold.
                + sword
                < again
            = first
                > " Just browsing...
                    " Let me know if you need help...
                < done
            $ again
                ? " Anything else?
                    ...
                    > " Nope.
                    < done
            $ done
                " Thank you, come again!
                <

        > ! attacked
            %50
                ! run
                " Help!
            %50
                ! attack
                " You bastard!
            <
    = @home
        ? " Hello, what are you doing in my house?
            > " Came to rob you!
                ! run
                " Help!
                <
            > " Sorry, wrong door... <
            " Goodnight.
        <
    = hour: 16 > 6
        > ? " You'll have to come back tomorrow.
    = else
        > ?" Be opening shortly.                
```
