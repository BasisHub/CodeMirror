CodeMirror.defineMode("bbj", function(conf, parserConf) {
    var ERRORCLASS = 'error';

    function wordRegexp(words) {
        return new RegExp("^((" + words.join(")|(") + "))\\b", "i");
    }

    var singleOperators = new RegExp("^[\\=\\+\\-\\*/%&\\\\|\\^~<>!]");
    var singleDelimiters = new RegExp('^[\\(\\)\\[\\]\\{\\}@,:`=;]');
    var doubleOperators = new RegExp("^((<>)|(<=)|(>=)|(<>))");
    var doubleDelimiters = new RegExp("^((\\+=)|(\\-=)|(\\*=)|(%=)|(/=)|(&=)|(\\|=)|(\\^=))");
    var identifiers = new RegExp("^#?[_A-Za-z][_A-Za-z0-9]*?");

    var openingKeywords = ['class','method', 'interface','for','while','if','switch'];
    var middleKeywords = ['else','case'];
    var endKeywords = ['fi','endif','next','wend','classend','methodend','interfaceend'];
    var comment = wordRegexp(['rem']);
    
    var wordOperators = wordRegexp(['and', 'or', 'not', 'xor']);

    var commonkeywords = ['.setCallback',
                          'CHANOPT','CLIPCLEAR','CLIPFROMFILE','CLIPFROMSTR','CLIPLOCK','CLIPTOFILE','CLIPUNLOCK','CLOSE','DIRECT',
                          'DISABLE','ENABLE','CHDIR','DENUM','ERASE','FIELD','FILE','FILEOPT','FLOATINGPOINT','INDEXED','INITFILE',
                          'IMPORT','JERASE','JCLOSE','JOPEN','LCHECKIN','LOCK','MKDIR','OPEN','PRECISION','PREFIX','PROGRAM','REMOVE',
                          'REDIM','RENAME','RENUM','RESCLOSE','RESERVE','RMDIR','SERIAL','SETDAY','SETDRIVE','SETOPTS','SETTERM','SETTIME',
                          'SORT','SQLCLOSE','SQLCOMMIT','SQLEXEC','SQLOPEN','SQLPREP','SQLROLLBACK','SQLSET','STRING','TCLOSE','TCOMMIT',
                          'TROLLBACK','UNLOCK','WAIT','XFILE','ADDR','BACKGROUND','BREAK','BYE','CALL','CISAM','CLASS','CLASSEND','CLEARP',
                          'CONTINUE','DECLARE','DIM','DROP','DUMP','ENDTRACE','ENTER','ESCAPE','ESCOFF','ESCON','EXECUTE','EXTRACT','EXTRACTRECORD',
                          'FIND','FINDRECORD','INTERFACE','INTERFACEEND','INPUT','INPUTE','INPUTN','INPUTRECORD','JKEYED','MERGE','METHOD','METHODRET',
                          'METHODEND','MKEYED','NO_OP','PRINT','PRINTRECORD','READ','READRECORD','RELEASE','REPEAT','RESET','RETRY','SAVE','SAVEP','SELECT',
                          'SETTRACE','START','STOP','THROW','UPDATELIC','USE','VKEYED','WRITE','WRITERECORD','XCALL','XKEYED','SETREAD','SETWRITE','ASSERT',
                          'new','ALL','AND','BEGIN','CALLBACK','CASE','CAST','CLEAR','DATA','DEF','DEFAULT','DELETE','DOM','DREAD','ELSE','END','ERR','ENDIF',
                          'EXCEPT','EXIT','EXITTO','EXTENDS','FI','FNEND','FNERR','FOR','FROM','GOSUB','GOTO','IMPLEMENTS','IOL','IOLIST','LET','LIMIT','LIST'
                          ,'LOAD','NEXT','ON','PRIVATE','PROCESS_EVENTS','PROTECTED','PUBLIC','READ_RESOURCE','REM','REMOVE_CALLBACK','RESTORE','RETURN','RUN',
                          'SETERR','SETESC','SORTBY','START','STATIC','STEP','SWEND','SWITCH','TABLE','TBL','TO','UNTIL','WEND','WHERE','WHILE','PRREF','ABS',
                          'ADJN','AND','ARGV','ASC','ATH','ATN','BBJAPI','BBJAPI','BIN','BSZ','CHANOPT','CHR','CLIENTENV','CLIPISFORMAT','CLIPREGFORMAT',
                          'CLIPTOSTR','COS','CPL','CRC','CRC16','CTRL','CVS','CVT','DATE','DEC','DECRYPT','DIMS','DIR','DSK','ENCRYPT','ENV','EPT','ERRMES',
                          'FATTR','FBIN','FDEC','FID','FIELD','FILEOPEN','FILEOPT','FILESAVE','FILL','FIN','FPT','GAP','HSA','HSH','HTA','IFF','IND','INFO',
                          'INT','IOR','JUL','KEY','KEYF','KEYL','KEYN','KEYP','KGEN','LCHECKOUT','LEN','LINFO','LOG','LRC','LST','MASK','MAX','MENUINFO','MIN',
                          'MOD','MSGBOX','NEVAL','NFIELD','NOT','NOTICE','NOTICETPL','NULL','NUM','PAD','PCK','PGM','POS','PUB','RESFIRST','RESGET','RESINFO',
                          'RESNEXT','RESOPEN','RND','ROUND','SCALL','SENDMSG','SERVERENV','SEVAL','SGN','SIN','SQLERR','SQLFETCH','SQLLIST','SQLTABLES','SQLTMPL',
                          'SQR','SSORT','SSZ','STBL','STR','SWAP','GET_FILESYSTEM','GET_SYSGUI','TBL','TCB','TMPL','TOPEN','TSK','UPK','WINFIRST','WININFO',
                          'WINNEXT','XFID','XFIN','XKGEN','XSSORT','XOR','XXX','ARGC','CTL','DSZ','PSZ','SQLUNT','TIM','UNT','CHN','DAY','OPTS','PFX','REV',
                          'SQLCHN','SSN','SYS','process_events'
                          ];

    var commontypes = ['BBjNumber', 'BBjString', 'BBjInt', 'BBjAPI'];

    var keywords = wordRegexp(commonkeywords);
    var types = wordRegexp(commontypes);
    
    var stringPrefixes = new RegExp('("|\\$)'); 
    
    var opening = wordRegexp(openingKeywords);
    var middle = wordRegexp(middleKeywords);
    var closing = wordRegexp(endKeywords);
    var doubleClosing = wordRegexp(['end']);
    var doOpening = wordRegexp(['do']);

    var indentInfo = null;


    function indent(_stream, state) {
      state.currentIndent++;
    }

    function dedent(_stream, state) {
      state.currentIndent--;
    }
    // tokenizers
    function tokenBase(stream, state) {
        if (stream.eatSpace()) {
            return null;
        }

        var ch = stream.peek();

        // Handle Comments
        if (stream.match(comment)) {
            stream.skipToEnd();
            return 'comment';
        }


        // Handle Number Literals
        if (stream.match(/^((&H)|(&O))?[0-9\.a-f]/i, false)) {
            var floatLiteral = false;
            // Floats
            if (stream.match(/^\d*\.\d+F?/i)) { floatLiteral = true; }
            else if (stream.match(/^\d+\.\d*F?/)) { floatLiteral = true; }
            else if (stream.match(/^\.\d+F?/)) { floatLiteral = true; }

            if (floatLiteral) {
                // Float literals may be "imaginary"
                stream.eat(/J/i);
                return 'number';
            }
            // Integers
            var intLiteral = false;
            // Hex
            if (stream.match(/^&H[0-9a-f]+/i)) { intLiteral = true; }
            // Octal
            else if (stream.match(/^&O[0-7]+/i)) { intLiteral = true; }
            // Decimal
            else if (stream.match(/^[1-9]\d*F?/)) {
                // Decimal literals may be "imaginary"
                stream.eat(/J/i);
                intLiteral = true;
            }
            // Zero by itself with no other piece of number.
            else if (stream.match(/^0(?![\dx])/i)) { intLiteral = true; }
            if (intLiteral) {
                // Integer literals may be "long"
                stream.eat(/L/i);
                return 'number';
            }
        }

        // Handle Strings
        if (stream.match(stringPrefixes)) {
            state.tokenize = tokenStringFactory(stream.current());
            return state.tokenize(stream, state);
        }

        // Handle operators and Delimiters
        if (stream.match(doubleDelimiters)) {
            return null;
        }
        if (stream.match(doubleOperators)
            || stream.match(singleOperators)
            || stream.match(wordOperators)) {
            return 'operator';
        }
        if (stream.match(singleDelimiters)) {
            return null;
        }
        if (stream.match(opening)) {
            indent(stream,state);
            return 'keyword';
        }

        if (stream.match(middle)) {
            return 'keyword';
        }

        if (stream.match(closing)) {
            dedent(stream,state);
            return 'keyword';
        }

        if (stream.match(types)) {
            return 'keyword';
        }

        if (stream.match(keywords)) {
            return 'keyword';
        }

        if (stream.match(identifiers)) {
            return 'variable';
        }


        

        // Handle non-detected items
        stream.next();
        
        return ERRORCLASS;
    }

    function tokenStringFactory(delimiter) {
        var singleline = delimiter.length == 1;
        var OUTCLASS = 'string';

        return function(stream, state) {
            while (!stream.eol()) {
                stream.eatWhile(/[^'"\\$]/);
                if (stream.match(delimiter)) {
                    state.tokenize = tokenBase;
                    return OUTCLASS;
                } else {
                    stream.eat(/['"\\$]/);
                }
            }
            if (singleline) {
                if (parserConf.singleLineStringErrors) {
                    return ERRORCLASS;
                } else {
                    state.tokenize = tokenBase;
                }
            }
            return OUTCLASS;
        };
    }


    function tokenLexer(stream, state) {
        var style = state.tokenize(stream, state);
        var current = stream.current();

        // Handle '.' connected identifiers
        if (current === '.') {
            style = state.tokenize(stream, state);
            current = stream.current();
            if (style === 'variable') {
                return 'variable';
            } else {
                return ERRORCLASS;
            }
        }


        var delimiter_index = '[({'.indexOf(current);
        if (delimiter_index !== -1) {
            indent(stream, state );
        }
        if (indentInfo === 'dedent') {
            if (dedent(stream, state)) {
                return ERRORCLASS;
            }
        }
        delimiter_index = '])}'.indexOf(current);
        if (delimiter_index !== -1) {
            if (dedent(stream, state)) {
                return ERRORCLASS;
            }
        }

        return style;
    }

    var external = {
        electricChars:"dDpPtTfFeE ",
        startState: function() {
            return {
              tokenize: tokenBase,
              lastToken: null,
              currentIndent: 0,
              nextLineIndent: 0,
              doInCurrentLine: false


          };
        },

        token: function(stream, state) {
            if (stream.sol()) {
              state.currentIndent += state.nextLineIndent;
              state.nextLineIndent = 0;
              state.doInCurrentLine = 0;
            }
            var style = tokenLexer(stream, state);

            state.lastToken = {style:style, content: stream.current()};



            return style;
        },

        indent: function(state, textAfter) {
            var trueText = textAfter.replace(/^\s+|\s+$/g, '') ;
            if (trueText.match(closing) || trueText.match(doubleClosing) || trueText.match(middle)) return conf.indentUnit*(state.currentIndent-1);
            if(state.currentIndent < 0) return 0;
            return state.currentIndent * conf.indentUnit;
        }

    };
    return external;
});

CodeMirror.defineMIME("text/x-bbj", "bbj");
