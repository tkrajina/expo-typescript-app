import { Linking } from "expo";
import React from "react";
import { Text, TextProps, TextStyle, View } from "react-native";
import { Testing } from "../testing/testing";
import { renderCounter, Utils } from "../utils/misc";
import { TextWithLinks } from "./TextWithLinks";
import { HorizontalLine } from "../utils/components";

const FONT_STYLE = "fontStyle";
const FONT_STYLE_ITALIC = "italic";
const FONT_WEIGHT = "fontWeight";
const FONT_WEIGHT_BOLD = "bold";

enum SectionType {
  TEXT,
  LIST,
  QUOTE,
  HORIZONTAL_LINE,
  EMPTY_LINE,
  HEADING
}

export const EXAMPLE_TEXT = `# Title

## Subtitle

### Subsubtitle

> Quote without formattings (for now)
> Second line

normal *italic* **bold *italic*** fdjskl.

horizontal line:

---

* List item #1
* List item #2
* List item #3

This is an [example link](http://example.com/). Or <http://example.com/>. Or just http://example.com/ .`;

class Section {
  constructor(public readonly type: SectionType, public readonly lines: string[]) {}
}

export class Replacement {
  constructor(public readonly expr: RegExp | string, public readonly replacement: (args: any[], fontScale: number) => any) {}
}

interface SimplifiedMarkdownProps {
  text: string;
  replacements?: Replacement[];
  fontScale?: number;
}
/*
 * TODO Use `AppText` instead of `Text` but in that case the normal bold italic formatting must be implemented using custom fonts (and we need to add the bold&italic ttf).
 */
export class SimplifiedMarkdown extends React.PureComponent<SimplifiedMarkdownProps> {
  defaultReplacements: Replacement[] = [
    new Replacement(/\[(.*?)\]\((.*?)\)/, args => (
      <MDText fontScale={this.props.fontScale} style={{ color: "blue" }} onPress={() => Linking.openURL(args[2])}>
        {args[1]}
      </MDText>
    )),
    new Replacement(/<(.*?)>/, args => (
      <MDText fontScale={this.props.fontScale} style={{ color: "blue" }} onPress={() => Linking.openURL(args[1])}>
        {args[1]}
      </MDText>
    ))
  ];

  constructor(props: SimplifiedMarkdownProps) {
    super(props);
  }

  render() {
    renderCounter.count("simplified markdown");

    return <View>{this.replace(this.props.text)}</View>;
  }

  replace(md: string): any[] {
    const replKey = Math.random();
    const replStrings: { [substr: string]: any } = {};

    const replacements = this.defaultReplacements.slice();
    if (this.props.replacements) {
      replacements.push(...this.props.replacements);
    }

    for (const repl of replacements) {
      md = md.replace(repl.expr, (...theRest) => {
        const key = `:${replKey}:${Math.random()}:`;
        replStrings[key] = repl.replacement(theRest, this.props.fontScale);
        return key;
      });
    }
    const parts: any[] = md.split(new RegExp(`(:${replKey}:.*?:)`)); // No need to generate this regexp every time
    for (let n = 0; n < parts.length; n++) {
      const replacement = replStrings[parts[n]];
      if (replacement) {
        parts[n] = replacement;
      } else {
        parts[n] = this.sections(parts[n]);
      }
    }
    return parts;
  }

  sections(md: string): any[] {
    const sections: Section[] = [];
    let prevSection: Section;
    for (const line of md.split(/\n/g)) {
      const strippedLine = line.trim();
      let section: Section = null;
      if (line[0] == "#") {
        section = new Section(SectionType.HEADING, [strippedLine]);
      } else if (strippedLine[0] == ">") {
        const quoteLine = line.substr(1);
        if (prevSection && prevSection.type == SectionType.QUOTE) {
          prevSection.lines.push(quoteLine);
        } else {
          section = new Section(SectionType.QUOTE, [quoteLine]);
        }
      } else if (strippedLine.match(/^\s*[\-\*]\s+.*/)) {
        section = new Section(SectionType.LIST, [strippedLine]);
      } else if (strippedLine.match(/^\-\-\-*$/)) {
        section = new Section(SectionType.HORIZONTAL_LINE, []);
      } else if (!strippedLine) {
        if (prevSection && prevSection.type != SectionType.EMPTY_LINE) {
          section = new Section(SectionType.EMPTY_LINE, []);
        }
      } else {
        if (prevSection && prevSection.type == SectionType.TEXT) {
          prevSection.lines.push(line);
        } else {
          section = new Section(SectionType.TEXT, [line]);
        }
      }
      if (section) {
        sections.push(section);
        prevSection = section;
      }
    }

    const res: any[] = [];
    for (let i = 0; i < sections.length; i++) {
      const key = "" + i;
      const section = sections[i];
      switch (section.type) {
        case SectionType.TEXT:
          res.push(
            <MDText key={key} fontScale={this.props.fontScale}>
              {this.simpleTextToElements(section.lines.join(" "))}
            </MDText>
          );
          break;
        case SectionType.QUOTE:
          // TODO: Sections here:
          res.push(
            <View key={key} style={{ marginLeft: 15, padding: 10, borderLeftWidth: 1, borderColor: "#000" }}>
              <MDText fontScale={this.props.fontScale}>{this.simpleTextToElements(section.lines.join(" "))}</MDText>
            </View>
          );
          break;
        case SectionType.LIST:
          res.push(
            <View key={key} style={{ flexDirection: "row" }}>
              <View style={{ justifyContent: "flex-end" }}>
                <MDText fontScale={this.props.fontScale} style={{ fontSize: 12 }}>
                  {" "}
                  ●{" "}
                </MDText>
              </View>
              <View>
                {this.simpleTextToElements(
                  section.lines
                    .join(" ")
                    .substr(1)
                    .trim()
                )}
              </View>
            </View>
          );
          break;
        case SectionType.HORIZONTAL_LINE:
          res.push(<HorizontalLine />);
        case SectionType.EMPTY_LINE:
          res.push(<MDText key={key} fontScale={this.props.fontScale} />);
          break;
        case SectionType.HEADING:
          let hashes: string;
          let title: string;
          section.lines[0].replace(/^\s*(#*)(.*)$/, (_, h, t) => {
            hashes = h;
            title = t;
            return "";
          });
          let fontSize = 14;
          switch (hashes.length) {
            case 1:
              fontSize *= 1.6;
            case 2:
              fontSize *= 1.4;
            case 3:
              fontSize *= 1.2;
          }
          res.push(
            <MDText key={key} fontScale={this.props.fontScale} style={{ fontSize: fontSize, fontWeight: "bold" }}>
              {this.simpleTextToElements(title)}
            </MDText>
          );
          break;
        default:
          console.error(`Invalid readme type: ${section.type}`);
      }
    }
    return res;
  }

  simpleTextToElements(md: string): any[] {
    // fontStyle: 'italic',
    // fontWeight: "bold"
    const res: any[] = [];
    const parts = splitSimpleText(md);
    const style: { [_: string]: string } = {};
    for (let i = 0; i < parts.length; i++) {
      const key = "" + i;
      const part = parts[i];
      if ((part as number).toExponential) {
        const n = part as number;
        const prev = parts[i - 1] ? "" + parts[i - 1] : " ";
        const next = parts[i + 1] ? "" + parts[i + 1] : " ";
        const spaceBefore = prev[prev.length - 1].match(/\s/);
        const spaceAfter = next[0].match(/\s/);
        //res.push(<MDText>[{spaceBefore ? "s" : "n"}{n}{spaceAfter ? "s" : "n"}]</MDText>);
        if (spaceBefore && spaceAfter) {
          res.push(
            <MDText key={key} fontScale={this.props.fontScale} style={Object.assign({}, style)}>
              {"*".repeat(n)}
            </MDText>
          );
        } else if (spaceBefore) {
          // Start
          if (n == 1) {
            style[FONT_STYLE] = FONT_STYLE_ITALIC;
          } else if (n == 2) {
            style[FONT_WEIGHT] = FONT_WEIGHT_BOLD;
          } else if (n >= 3) {
            style[FONT_STYLE] = FONT_STYLE_ITALIC;
            style[FONT_WEIGHT] = FONT_WEIGHT_BOLD;
          }
        } else if (spaceAfter) {
          // End
          if (n == 1) {
            delete style[FONT_STYLE];
          } else if (n == 2) {
            delete style[FONT_WEIGHT];
          } else if (n >= 3) {
            delete style[FONT_STYLE];
            delete style[FONT_WEIGHT];
          }
        } else {
          res.push(<TextWithLinks key={key} style={Object.assign({}, style)} text={"*".repeat(part as number)} />);
        }
      } else {
        res.push(<TextWithLinks key={key} style={Object.assign({}, style)} text={"" + part} />);
      }
    }
    return res;
  }
}

function splitSimpleText(md: string): (string | number)[] {
  const parts: (string | number)[] = [""];
  for (let i = 0; i < md.length; i++) {
    const c = md[i];
    console.log(i + " " + c + "...");
    if (c == "\\") {
      console.log("bu");
      if ("number" == typeof parts[parts.length - 1]) {
        parts.push("");
      }
      i++;
      parts[parts.length - 1] += md[i];
    } else if (c == "*") {
      if ("number" == typeof parts[parts.length - 1]) {
        (parts[parts.length - 1] as number)++;
      } else {
        parts.push(1);
      }
    } else {
      if ("number" == typeof parts[parts.length - 1]) {
        parts.push("");
      }
      parts[parts.length - 1] += c;
    }
  }
  return parts;
}

function testSplit(ctx: Testing.TestingCtx, parts: any[], expected: any[]) {
  ctx.assertEquals(parts.length, expected.length, `${JSON.stringify(parts)} vs ${JSON.stringify(expected)}`);
  for (let i = 0; i < parts.length; i++) {
    ctx.assertEquals(parts[i], expected[i], `#${i} in: ${JSON.stringify(parts)} vs ${JSON.stringify(expected)}`);
  }
}

Testing.registerTests(
  "markdown parsing",
  ctx => testSplit(ctx, splitSimpleText(`text`), ["text"]),
  ctx => testSplit(ctx, splitSimpleText(`text*`), ["text", 1]),
  ctx => testSplit(ctx, splitSimpleText(`text\\*`), ["text*"]),
  ctx => testSplit(ctx, splitSimpleText(`text\\* * `), ["text* ", 1, " "]),
  ctx => testSplit(ctx, splitSimpleText(`text\\* ** `), ["text* ", 2, " "])
);

interface MDTextProps extends TextProps {
  fontScale: number;
}
export class MDText extends React.PureComponent<MDTextProps> {
  constructor(props: MDTextProps) {
    super(props);
  }
  render() {
    let props = Object.assign({}, this.props) as TextProps;
    if (Utils.isEmpty(props)) {
      props = {};
    }
    if (Utils.isEmpty(props.style)) {
      props.style = {};
    }
    if (this.props.fontScale) {
      (props.style as TextStyle).fontSize = 12 * this.props.fontScale;
    }
    return <Text {...props}>{this.props.children}</Text>;
  }
}